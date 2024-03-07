#!/usr/bin/env python3

import os
import re
import secrets
import string
import sys
import tarfile
import uuid
from argparse import (
    ArgumentParser,
    ArgumentTypeError,
    SUPPRESS
)
from collections import defaultdict
from datetime import datetime
from minio import Minio
from pathlib import Path
from signal import SIGINT, signal
from threading import Thread
from time import sleep

from rich.console import Group
from rich.live import Live
from rich.padding import Padding
from rich.panel import Panel
from rich.progress import track
from tenacity import RetryCallState, RetryError, TryAgain

sys.path.append(str(Path(__file__).resolve().parents[4] / "python"))
from driver_script import DriverScript, lazy_property  # noqa: E402
from kubectl import KubeCtl  # noqa: E402


class GMSSystemTest(DriverScript):
    """
    This class is designed to handle our automated testing against
    running instances of the system.  It contains the following stages:

    Install
        Install an instance of the system for testing purposes.
    Wait
        Wait for all the pods to reach a "Running" or "Succeeded" state.
    Sleep
        Sleep an additional amount of time to wait for the applications
        in all the pods to be ready to process data.
    Test
        Apply a test augmentation to the running instance of the system
        and collect the results.
    Uninstall
        Uninstall the instance now that testing is complete.

    Attributes:
        instance_name (str):  The name of the instance that will be
            used for testing purposes.
        instance_ready (bool):  Whether all the pods are in either a
            "Running" or "Completed" state.
        instance_tag (str):  The name of the Docker image tag.
        instance_type (str):  The name of the Docker image tag.
        kubectl (KubeCtl):  A :class:`KubeCtl` instance initialized with
            ``instance_name`` as the namespace.
        kubectl_gms (KubeCtl):  A :class:`KubeCtl` instance for the
            ``gms`` namespace.
        log_dir (Path):  The directory for collecting container logs.
        logs_saved (bool):  Whether the logs have been saved yet.
        minio (dict):  The information needed to communicate with the
            MinIO test reporting service.
        parallel (int):  How many identical test augmentation pods to
            launch in parallel.
        reports_dir (Path):  The directory for collecting test reports.
        set_args (list[str]):  The ``--set`` arguments to pass to
            ``gmskube`` when applying the test augmentation.
        sleep (int):  How many seconds to sleep while waiting for the
            system to be ready.
        test_attempt (int):  A counter for the number of times a test
            has been attempted.
        test_name (str):  The name of the test to run.
        test_success (bool):  Whether the tests passed successfully.
        wait_timeout (int):  How long to wait (in seconds) for all the
            pods in the instance to spin up.

    Note:
        Additional attributes are defined in the :class:`DriverScript`
        base class.
    """

    def __init__(self):
        super().__init__(
            console_force_terminal=(True if os.getenv("CI") else None),
            console_log_path=bool(os.getenv("RICH_LOG_PATH"))
        )
        self.instance_name = None
        self.instance_ready = False
        self.instance_tag = None
        self.instance_type = None
        self.kubectl = None
        self.kubectl_gms = KubeCtl("gms")
        self.log_dir = None
        self.logs_saved = False
        self.minio = {
            "access_key": str(uuid.uuid4()),
            "augmentation_name": "minio-test-reports",
            "report_bucket": "reports",
            "secret_key": str(uuid.uuid4())
        }
        self.parallel = None
        self.reports_dir = None
        self.set_args = None
        self.sleep = None
        self.test_attempt = 0
        self.test_name = None
        self.test_success = False
        self.wait_timeout = None

    def create_unique_reports_directory(self) -> None:
        """
        Create a uniquely-named reports directory in the current working
        directory.
        """
        alphabet = string.ascii_lowercase + string.digits
        random_string = "".join(secrets.choice(alphabet) for _ in range(5))
        unique_name = (
            f"system-test-reports-{datetime.now():%Y%m%dT%H%M%S}-"
            + random_string
        )
        self.reports_dir = Path.cwd() / unique_name
        self.log_dir = self.reports_dir / "container-logs"
        self.log_dir.mkdir(parents=True)

    def create_install_commands(self) -> list[str]:
        """
        Create the commands to install the testing instance.

        Returns:
            The command(s) to execute.
        """
        minio_command = (
            f"gmskube augment apply --tag {self.instance_tag} "
            f"--name {self.minio['augmentation_name']} "
            f"--set minioReportBucket={self.minio['report_bucket']} "
            f"--set minioAccessKey={self.minio['access_key']} "
            f"--set minioSecretKey={self.minio['secret_key']} "
            f"{self.instance_name}"
        )
        node_env = "development"
        if self.instance_type == "ian":
            return [
                f"GMS_DISABLE_KEYCLOAK_AUTH=true "
                f"ian-sim-deploy --tag-auto {self.instance_tag} "
                f"{self.instance_name} {node_env}",
                minio_command
            ]
        elif self.instance_type == "sb":
            return [
                f"gmskube install --tag {self.instance_tag} --type "
                f"{self.instance_type} --augment oracle "
                f"--set interactive-analysis-ui.env."
                f"GMS_DISABLE_KEYCLOAK_AUTH=true "
                f"{self.instance_name}",
                minio_command
            ]
        elif self.instance_type == "soh":
            return [
                f"gmskube install --tag {self.instance_tag} "
                f"--type {self.instance_type} --set "
                f"interactive-analysis-ui.env.NODE_ENV={node_env} "
                f"--set interactive-analysis-ui.env."
                f"GMS_DISABLE_KEYCLOAK_AUTH=true "
                f"{self.instance_name}",
                minio_command
            ]

    def create_unique_instance_name(self) -> str:
        """
        Create a unique name for this instance of the system.

        Returns:
            The unique instance name, which is of the form
            ``gms-system-test-<random-string>``.
        """
        prefix = "gms-system-test"
        alphabet = string.ascii_lowercase + string.digits
        random_string = "".join(secrets.choice(alphabet) for _ in range(10))
        instance_name = f"{prefix}-{random_string}"
        self.console.log(
            f"`GMSSystemTest` will create an instance named `{instance_name}` "
            "for testing purposes."
        )
        return instance_name

    def _run_pre_stage_actions_install(self) -> None:
        """
        Before getting started with the first stage, create a directory
        for storing reports.
        """
        self.create_unique_reports_directory()

    @DriverScript.stage(
        "install",
        "Installing an instance for testing purposes..."
    )
    def install_instance(self) -> None:
        """
        Stand up an instance of the system for the sake of running a
        test augmentation against it.
        """
        if self.instance_name is None:
            self.instance_name = self.create_unique_instance_name()
        self.kubectl = KubeCtl(self.instance_name)
        for command in self.create_install_commands():
            return_code = self.run(
                command,
                pretty_print=True,
                shell=True
            ).returncode
            if return_code != 0:
                raise RuntimeError(
                    "Instance failed to install.  Error code:  "
                    f"{return_code}."
                )

    def _run_post_stage_actions_install(self) -> None:
        """
        Before leaving the 'install' stage, ensure that either the user
        supplied, or that we automatically generated, a name for the
        instance to test against.

        Raises:
            RuntimeError:  If the user chose not to run the 'install'
                stage, but failed to supply an instance name.
        """
        if self.instance_name is None:
            raise RuntimeError(
                "The instance name is necessary for future stages.  "
                "Specify `--instance` on the command line."
            )

    def display_pod_info(self, dynamic: bool = True) -> Padding:
        """
        Display information about the pods for the testing instance.
        For the user in the terminal, display a dynamically updated
        table of pod information.  For CI, only display one pod that is
        not yet ready, or the complete table if :arg:`dynamic` is
        ``False``.

        Args:
            dynamic:  Whether to dynamically display pod information
                (``True``), or to just display the pod table
                (``False``).

        Returns:
            The relevant pod information, wrapped in a
            :class:`rich.padding.Padding`.
        """
        pod_table = self.kubectl.get_pods()
        not_running, not_ready = [], []
        for line in pod_table.splitlines()[1:]:
            name, ready, status = line.split()[:3]
            if status not in ["Running", "Completed"]:
                not_running.append(name)
                continue
            if status == "Running":
                containers_ready, total_containers = ready.split("/")
                if containers_ready != total_containers:
                    not_ready.append(name)
        if (dynamic and os.getenv("CI") and (not_running or not_ready)):
            waiting_for_pod = not_running[0] if not_running else not_ready[0]
            info = f"Waiting for pod:  {waiting_for_pod}"
        else:
            info = Panel(
                pod_table,
                title=f"Pods for Instance '{self.instance_name}'",
                expand=False
            )
        return Padding(info, (0, 0, 0, 11))

    def _run_pre_stage_actions_wait(self) -> None:
        """
        Before we wait for all the pods to be running, we must ensure we
        have a :class:`KubeCtl` instance.
        """
        if self.kubectl is None:
            self.kubectl = KubeCtl(self.instance_name)

    @DriverScript.stage(
        "wait",
        "Checking to see if all pods are running..."
    )
    def check_all_pods_ready(self) -> None:
        """
        Check to see if all the pods for the testing instance are ready
        for running a test augmentation against it.  This will wait a
        reasonable amount of time for the pods to come up, as it usually
        takes a little time after a ``gmskube install`` completes.
        """
        if self.dry_run:
            self.print_dry_run_message("Skipping this step.")
            self.instance_ready = True
            return
        try:
            self.commands_executed.append("# Wait for all pods to be ready.")
            with Live(self.display_pod_info(),
                      refresh_per_second=1,
                      console=self.console) as live:
                self.kubectl.wait_for_all_pods_ready(
                    timeout=self.wait_timeout,
                    before_sleep=(
                        lambda retry_state:
                            live.update(self.display_pod_info())
                    )
                )
                live.update(self.display_pod_info(dynamic=False))
            self.console.log("[green]ALL PODS READY!")
            self.instance_ready = True
        except RuntimeError as e:
            self.console.log(f"[red]{e}")
            self.instance_ready = False
        except RetryError:
            self.console.log("[red]NOT ALL PODS READY!")
            self.instance_ready = False

    def _run_post_stage_actions_wait(self) -> None:
        """
        If we've given up on waiting for the instance to be ready,
        make it such that we skip over the 'sleep' and 'test' stages.
        """
        if not self.instance_ready:
            for stage in ["sleep", "test"]:
                if stage in self.stages_to_run:
                    self.stages_to_run.remove(stage)

    @DriverScript.stage(
        "sleep",
        "Sleeping to allow the application to be ready..."
    )
    def sleep_after_pods_running(self) -> None:
        """
        This is intended to be used after :func:`check_all_pods_ready`
        such that we can wait for the applications within each pod to be
        ready to process data.
        """
        if self.dry_run:
            self.print_dry_run_message("Skipping this step.")
            return
        self.commands_executed.append(f"sleep {self.sleep}")
        time_to_sleep = track(
            range(self.sleep),
            description=(" " * 11),
            console=self.console
        )
        for _ in time_to_sleep:
            sleep(1)

    def _run_pre_stage_actions_test(self) -> None:
        """
        Before entering the 'test' stage, ensure the
        :attr:`instance_tag` is set, as future stages will require it.

        Raises:
            RuntimeError:  If the tag isn't set and we're not able to
                determine it.
        """
        if self.instance_tag is None:
            if labels := self.kubectl.get_configmap_labels("gms"):
                self.instance_tag = labels["gms/image-tag"]
            else:
                raise RuntimeError(
                    "Unable to determine the instance tag, which is needed "
                    "for future stages."
                )

    def apply_test_augmentation(self) -> None:
        """
        Apply the test augmentation to the system.
        """
        command = (
            f"gmskube augment apply --tag {self.instance_tag} --name "
            f"{self.test_name} {' '.join(self.set_args)} "
            f"{self.instance_name}"
        )
        self.run(command, pretty_print=True, shell=True)

    def _get_minio_endpoint(self) -> str:
        """
        Determine the ingress endpoint for the ``minio-test-reports``
        augmentation.

        Raises:
            RuntimeError:  If it's not possible to determine the host,
                port, or path.

        Returns:
            The host, port, and path.
        """
        host, paths = self.kubectl.get_endpoints(
            self.minio["augmentation_name"]
        )
        if host is None or paths is None:
            raise RuntimeError(
                f"Failed to locate the `{self.minio['augmentation_name']}` "
                "endpoint."
            )
        ports = self.kubectl_gms.get_resource("configmap/ingress-ports-config")
        if not ports:
            raise RuntimeError(
                "Failed to get the port for the "
                f"`{self.minio['augmentation_name']}` endpoint."
            )
        ports = ports[0]["data"]
        path = paths[0]
        if self.kubectl.istio_enabled():
            port = ports["istio_port"]
        else:
            port = ports["nginx_port"]
        return f"{host}:{port}{path}"

    @lazy_property
    def minio_client(self) -> Minio:
        """
        Create a :class:`Minio` client for the ``minio-test-reports``
        augmentation.

        Raises:
            RuntimeError:  If the client can't be created, or if the
                report bucket can't be found.

        Returns:
            The MinIO client.
        """
        endpoint = self._get_minio_endpoint()
        client = Minio(
            endpoint,
            access_key=self.minio["access_key"],
            secret_key=self.minio["secret_key"]
        )
        if client is None:
            raise RuntimeError(
                f"Failed to connect to MinIO endpoint '{endpoint}'.  No "
                "results can be retrieved."
            )
        if not client.bucket_exists(self.minio["report_bucket"]):
            raise RuntimeError(
                f"Unable to locate the '{self.minio['report_bucket']}' "
                f"container in the MinIO endpoint '{endpoint}'.  No results "
                "can be retrieved."
            )
        return client

    def extract_minio_object(
        self,
        file_name: str,
        local_filepath: Path,
        results_dir: Path
    ) -> None:
        """
        Retrieve a zipped tar file from the Minio report bucket and
        unzip it to the results directory.

        Args:
            file_name:  The name of the file to retrieve.
            local_filepath:  Where to store it locally on disk.
            results_dir:  Where to extract the results to.
        """
        self.minio_client.fget_object(
            self.minio["report_bucket"],
            file_name,
            str(local_filepath)
        )
        tar = tarfile.open(local_filepath)
        tar.extractall(results_dir)
        tar.close()
        local_filepath.unlink()

    def pod_succeeded(self, output_file: Path) -> bool:
        """
        Determine the success or failure of the test augmentation pod by
        parsing its output.

        Args:
            output_file:  The file to parse.

        Raises:
            RuntimeError:  If the appropriate result string cannot be
                found in the file.

        Returns:
            ``True`` if the pod succeeded; ``False`` if not.
        """
        with open(output_file) as f:
            output = f.read()
            if "TEST AUGMENTATION POD RESULT:  SUCCESS" in output:
                return True
            elif "TEST AUGMENTATION POD RESULT:  FAILURE" in output:
                return False
            else:
                raise RuntimeError(
                    "Didn't find 'TEST AUGMENTATION POD RESULT' in "
                    f"'{output_file}'."
                )

    def retrieve_test_results(self) -> bool:
        """
        Retrieve one or more compressed tar files containing test
        results from the MinIO test reporting service.

        Returns:
            Whether or not testing passed.
        """
        results_dir = (
            self.reports_dir / f"{self.test_name}-{self.test_attempt}"
        )
        results_dir.mkdir()
        results = [_.object_name for _ in
                   self.minio_client.list_objects(self.minio["report_bucket"])]
        num_results = 0
        pod_success = []
        for file_name in results:
            if self.test_name not in file_name:
                continue
            num_results += 1
            local_filepath = results_dir / file_name
            self.extract_minio_object(file_name, local_filepath, results_dir)
            output_file = results_dir / local_filepath.stem / "testrun.txt"
            pod_success.append(self.pod_succeeded(output_file))
        if num_results < self.parallel:
            raise RuntimeError(
                f"Expecting {self.parallel} results objects in the "
                f"'{self.minio['report_bucket']}' MinIO bucket; only found "
                f"{num_results}."
            )
        return all(pod_success or [False])

    @DriverScript.stage("test", "Running the specified test...")
    def run_test(self) -> None:
        """
        Apply the test augmentation to the system, wait for it to
        complete, and retrieve the test results.

        Raises:
            RuntimeError:  If the test job fails to start for some
                reason.
            TryAgain:  If the test was unsuccessful, so the stage can be
                retried.
        """
        self.test_attempt += 1
        self.apply_test_augmentation()
        if self.dry_run:
            self.test_success = True
            return
        if self.kubectl.resource_failed_to_start(f"jobs/{self.test_name}"):
            raise RuntimeError(
                f"'{self.test_name}' failed to start; aborting."
            )
        self.kubectl.wait(
            f"jobs/{self.test_name}",
            timeout=self.test_retry_timeout
        )
        self.console.log(f"Collecting results from '{self.test_name}'")
        self.test_success = self.retrieve_test_results()
        if self.test_success:
            self.console.log(f"[bold green]{self.test_name} PASSED")
        else:
            self.console.log(f"[bold red]{self.test_name} FAILED")
            raise TryAgain

    def _run_post_stage_actions_test(self) -> None:
        """
        If the 'test' stage was run, set the script success based on the
        test result.
        """
        if "test" in self.stages_to_run:
            self.script_success = self.instance_ready and self.test_success

    def _delete_test_augmentation(self) -> None:
        """
        Delete the test augmentation from the system.
        """
        command = (
            f"gmskube augment delete --tag {self.instance_tag} --name "
            f"{self.test_name} {self.instance_name}"
        )
        self.run(command, pretty_print=True, shell=True)

    def _remove_minio_results(self) -> None:
        """
        Remove any results associated with the test augmentation from
        the MinIO report bucket.
        """
        results = [_.object_name for _ in
                   self.minio_client.list_objects(self.minio["report_bucket"])]
        for file_name in results:
            if self.test_name in file_name:
                self.minio_client.remove_object(
                    self.minio["report_bucket"],
                    file_name
                )

    def _prepare_to_retry_stage_test(
        self,
        retry_state: RetryCallState
    ) -> None:
        """
        In preparation for rerunning a failed test augmentation, clean
        things up so the system is ready for the augmentation to be
        applied again.

        Args:
            retry_state:  Information regarding the retry operation in
                progress.
        """
        self._prepare_to_retry_stage(retry_state)
        self.kubectl.save_resource_logs(self.test_name, "job", self.log_dir)
        self._delete_test_augmentation()
        self._remove_minio_results()
        self.console.log("[bold yellow]Retrying the failed test...")

    def _run_pre_stage_actions_uninstall(self) -> None:
        """
        Before uninstalling the testing instance, save the logs from all
        the containers in all the pods.
        """
        self.save_logs()

    @DriverScript.stage(
        "uninstall",
        "Uninstalling the instance now that testing is complete..."
    )
    def uninstall_instance(self) -> None:
        """
        Now that testing is complete, tear down the instance of the
        system.
        """
        if not self.script_success:
            self.console.print(self.display_pod_info(dynamic=False))
        command = f"gmskube uninstall {self.instance_name}"
        self.run(command, pretty_print=True, shell=True)

    def print_script_execution_summary(
        self,
        extra_sections: dict[str, str] | None = None
    ) -> None:
        """
        Print a summary of everything that was done by the script.
        """
        extras = {"Test reports": str(self.reports_dir)}
        if extra_sections is not None:
            extras |= extra_sections
        super().print_script_execution_summary(extra_sections=extras)

    def _run_post_stage_actions_uninstall(self) -> None:
        """
        Since the 'uninstall' stage is the final one in the script,
        print the script execution summary after it wraps up.
        """
        self.print_script_execution_summary()

    def display_logs(self) -> Padding:
        """
        Display the files being generated in the :attr:`log_dir`.  For a user
        running in the terminal, display all the files, sorted by creation
        time, wrapped in a panel.  For CI, display only the most recently saved
        log file.

        Returns:
            A :class:`rich.padding.Padding` renderable with the appropriate
            contents.
        """
        files = sorted(
            os.listdir(self.log_dir),
            key=lambda file_name: os.path.getmtime(self.log_dir / file_name)
        )
        latest_file = files[-1] if files else ""
        info = (
            f"Saving Logs:  {latest_file}" if os.getenv("CI")
            else Panel(Group(*files), title="Saving Logs", expand=False)
        )
        return Padding(info, (0, 0, 0, 11))

    def log_saver(self) -> None:
        """
        The method :func:`save_logs` executes in a separate thread to
        save the logs.
        """
        self.kubectl.save_logs(self.log_dir)
        self.logs_saved = True

    def save_logs(self) -> None:
        """
        Save the logs for all the containers in the testing instance.
        Execute this in a separate thread, so the main thread can show
        the logs saved thus far in a :class:`rich.live.Live` display.
        """
        if (
            self.kubectl is not None and not self.dry_run
            and not self.logs_saved
        ):
            with Live(self.display_logs(),
                      refresh_per_second=1,
                      console=self.console) as live:
                log_thread = Thread(target=self.log_saver)
                log_thread.start()
                while not self.logs_saved:
                    sleep(1)
                    live.update(self.display_logs())
                log_thread.join()

    def keyboard_interrupt_handler(self, signal_number, stack_frame):
        """
        Clean-up operations for when the user hits Ctrl+C in the midst
        of a run.

        Args:
            signal_number:  Not used.
            stack_frame:  Not used.

        Raises:
            SystemExit:  To indicate that the script completed with an
                error.
        """
        self.console.log(
            "[yellow]Caught a keyboard interrupt signal.  Attempting to tear "
            "down the testing instance so we don't leave it lying around.  If "
            "you hit CTRL+C again, you'll need to manually delete this "
            "instance."
        )
        self.script_success = False
        self.uninstall_instance()
        raise SystemExit(1)

    def uninstall_on_exception(self) -> None:
        """
        In the event of an exception, try not to leave the testing
        instance lying around.
        """
        self.script_success = False
        self.console.print_exception()
        self.uninstall_instance()

    @lazy_property
    def parser(self) -> ArgumentParser:
        """
        Create an ``ArgumentParser`` that contains all the necessary
        arguments for this script.

        Returns:
            The argument parser for this script.

        Todo:
            * This ``ArgumentParser`` contains pieces from
              ``gmskube.py``.  The common arguments should be pulled out
              into a common location and then included in each file.
            * The list of supported types comes from ``gmskube.py``.
              Need to deal with the code duplication.
        """
        ap = super().parser
        ap.description = """
Description
===========

This script:
* stands up a temporary instance of the GMS system,
* waits for all the pods to be up and running,
* sleeps a given amount of time to wait for the application to be ready,
* runs a test augmentation against it, and
* tears down the temporary instance after testing completes.

The test must be specified by a GMS augmentation with a type of
``test``.  These augmentations are built into the ``gmskube`` container.
Running ``gmskube augment catalog --tag <tag>`` will show a list of all
available augmentations.  Which test is run can be specified via
``--test``.

Results
=======

Test augmentations copy their test results to a MinIO test reporting
service so that they can be gathered back to the machine on which this
script was executed.  Final reports will be gathered in a
``system-test-reports-{timestamp}-{unique-str}`` directory under the
current working directory.  Under this top-level directory there will be
(1) reports for the test itself, and (2) logs from all the containers
run as part of the testing in a ``container-logs`` directory.

Environment Variables
=====================

Additional environment variables can be provided to tests from the
command line via the ``--env`` argument.  Each ``env`` argument should
specify a value of the form ``variable=value``.

Examples
========

Run the ``jest`` test against a ``sb`` instance deployed from the
``develop`` branch::

    gms_system_test.py --type sb --tag develop --test jest
"""
        ap.set_defaults(stage=self.stages)
        instance_group = ap.add_argument_group(
            "Options for specifying the instance to test against"
        )
        instance_group.add_argument(
            "--tag",
            default=None,
            type=argparse_tag_name_type,
            help="The tag name, which corresponds to the Docker tag of the "
            "images.  The value entered will automatically be transformed "
            "according to the definition of the GitLab ``CI_COMMIT_REF_SLUG`` "
            "variable definition (lowercase, shortened to 63 characters, and "
            "with everything except ``0-9`` and ``a-z`` replaced with ``-``, "
            "no leading / trailing ``-``)."
        )
        instance_group.add_argument(
            "--type",
            default=None,
            choices=["ian", "sb", "soh"],
            help="The type of instance to stand up."
        )  # yapf: disable
        instance_group.add_argument(
            "--instance",
            default=None,
            help="If specified, use the given instance name rather than "
            "automatically generating one."
        )
        ap.add_argument(
            "--wait-timeout",
            default=60,
            type=int,
            help="How long to wait (in seconds) for all the pods in the "
            "temporary instance to spin up."
        )
        ap.add_argument(
            "--sleep",
            default=0,
            type=int,
            help="How long to wait between the pods reaching a 'Running' "
            "state and starting the test."
        )
        test_group = ap.add_argument_group(
            "Options for testing"
        )
        test_group.add_argument(
            "--test",
            help="The name of a test to run (see ``gmskube augment catalog "
            "--tag <reference>``)."
        )
        test_group.add_argument(
            "--env",
            type=argparse_set_env,
            action="append",
            help="Set environment variables in the test environment.  This "
            "argument can be specified multiple times to specify multiple "
            "values.  Examples:  ``--env FOO=bar`` will set ``FOO=bar`` for "
            "the test."
        )
        ap.set_defaults(
            test_retry_attempts=5,
            test_retry_delay=0,
            test_retry_timeout=1200
        )
        test_group.add_argument(
            "--parallel",
            default=1,
            type=int,
            choices=range(1, 11),
            help="How many identical test augmentation pods to launch in "
            "parallel."
        )  # yapf: disable
        for stage in ["install", "wait", "sleep", "uninstall"]:
            for arg in ["attempts", "delay", "timeout"]:
                getattr(self, f"{stage}_retry_{arg}_arg").help = SUPPRESS
        return ap

    def create_set_args(
        self,
        env_args: list[str] | None
    ) -> list[str]:  # yapf: disable
        """
        Create a list of ``--set`` arguments to pass to ``gmskube`` when
        applying the test augmentation.  This translates any ``--env``
        arguments passed to this script into the appropriate
        ``--set env.foo=bar`` form, and also sets the number of
        identical pods to launch if ``parallel`` is greater than 1.

        Args:
            env:  The (potentially empty or nonexistent) list of all the
                environment variables to be set for the test.

        Returns:
            The list of ``--set`` arguments.
        """
        set_args = defaultdict(list)
        for item in env_args or []:
            name, value = item.split("=", 1)
            if "." in name:
                test_name, name = name.split(".", 1)
            else:
                test_name = "global"
            set_args[test_name].append(f'--set env.{name}="{value}"')
        result = set_args["global"] + set_args[self.test_name]
        if self.parallel > 1:
            result.append(f"--set numIdenticalPods={self.parallel}")
        return result

    def parse_args(self, argv: list[str]) -> None:
        """
        Parse the command line arguments, and handle any special cases.

        Args:
            argv:  The command line arguments used when running this
                file as a script.

        Raises:
            SystemExit:  If the user doesn't specify a test to run, or
                if they don't provide the right combination of flags.
        """
        super().parse_args(argv)
        if self.args.env == [""]:
            self.args.env = []
        if "test" in self.args.stage and not self.args.test:
            self.raise_parser_error(
                "You must specify which test to run via the `--test` flag.  "
                "Run `gmskube augment catalog --tag <reference>` to see the "
                "available tests."
            )
        if "install" in self.args.stage and (
            self.args.tag is None or self.args.type is None
        ):
            self.raise_parser_error(
                "You must either specify (1) both `--tag` and `--type` to "
                "stand up a temporary instance, or (2) `--instance <name>` "
                "and omit `install` from the `--stage`s to run to test "
                "against an existing one."
            )
        self.instance_name = self.args.instance
        self.instance_tag = self.args.tag
        self.instance_type = self.args.type
        self.parallel = self.args.parallel
        self.set_args = self.create_set_args(self.args.env)
        self.sleep = self.args.sleep
        self.test_name = self.args.test
        self.test_retry_attempts = self.args.test_retry_attempts
        self.test_retry_delay = self.args.test_retry_delay
        self.test_retry_timeout = self.args.test_retry_timeout
        self.wait_timeout = self.args.wait_timeout

    def main(self, argv: list[str]) -> None:
        """
        This method handles
        * standing up an instance of the GMS system,
        * waiting for all the pods to come up,
        * waiting for the application to be ready,
        * running a test augmentation against the system, and
        * tearing down the instance.

        Args:
            argv:  The command line arguments used when running this
                file as a script.

        Raises:
            RuntimeError:  If the user forgot to pass in the instance
                name.
            SystemExit(0):  If everything passes successfully.
            SystemExit(1):  If any test fails, or if anything else goes
                wrong.
        """
        self.parse_args(argv)
        signal(SIGINT, self.keyboard_interrupt_handler)
        try:
            self.install_instance()
            self.check_all_pods_ready()
            self.sleep_after_pods_running()
            self.run_test()
            self.uninstall_instance()
        except Exception:
            self.uninstall_on_exception()
        finally:
            if not self.script_success:
                raise SystemExit(1)


def argparse_tag_name_type(s: str) -> str:
    """
    Transform the tag name into the ``CI_COMMIT_REF_SLUG`` as defined by
    GitLab:  lower-cased, shortened to 63 bytes, and with everything
    except ``0-9`` and ``a-z`` replaced with ``-``.  No leading/trailing
    ``-``.

    Todo:
        * This function is a copy of the one in ``gmskube.py``. It
          should be pulled out into a common location and then included
          in each file.
    """
    # `s.lower()` changes to lower case.
    # `re.sub` replaces anything other than `a-z` or `0-9` with `-`.
    # `strip('-')` removes any leading or trailing `-` after `re.sub`.
    # `[:63]` truncates to 63 characters.
    return re.sub(r'[^a-z0-9]', '-', s.lower()).strip('-')[:63]


def argparse_set_env(s: str) -> str:
    """
    Ensure the input is of the form ``VARIABLE=VALUE``.

    Args:
        s:  The input string.

    Raises:
        ArgumentTypeError:  If the string doesn't match the pattern.

    Returns:
        The input string.
    """
    if s and "=" not in s:
        raise ArgumentTypeError(
            "When specifying `--env`, you must supply the name/value pair "
            "as `Name=Value`."
        )
    return s


if __name__ == "__main__":
    gst = GMSSystemTest()
    gst.main(sys.argv[1:])
