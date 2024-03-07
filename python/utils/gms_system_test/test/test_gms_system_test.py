#!/usr/bin/env python3
"""
Unit tests for the ``gms_system_test.py`` script.
"""

import re
import shlex
import shutil
from argparse import ArgumentTypeError
from datetime import timedelta
from time import time
from unittest.mock import MagicMock, patch

import pytest
from minio import Minio
from rich.console import Console
from tenacity import Future, RetryError

from python.kubectl.kubectl.kubectl import KubeCtl
from python.utils.gms_system_test.gms_system_test.gms_system_test import (
    GMSSystemTest,
    argparse_tag_name_type,
    argparse_set_env
)


@pytest.fixture()
def gst() -> GMSSystemTest:
    gms_system_test = GMSSystemTest()
    gms_system_test.console = Console(log_time=False, log_path=False)
    gms_system_test.minio["access_key"] = "MINIO_ACCESS_KEY"
    gms_system_test.minio["secret_key"] = "MINIO_SECRET_KEY"
    return gms_system_test


def test_create_unique_reports_directory(gst: GMSSystemTest) -> None:
    reports_dirs = []
    for _ in range(5):
        gst.create_unique_reports_directory()
        reports_dirs.append(gst.reports_dir)
    for reports_dir in reports_dirs:
        assert reports_dir.name.startswith("system-test-reports-")
        assert reports_dir.exists()
        log_dir = reports_dir / "container-logs"
        for child in reports_dir.iterdir():
            assert child == log_dir
        assert not any(log_dir.iterdir())
        log_dir.rmdir()
        reports_dir.rmdir()
    assert len(reports_dirs) == len(set(reports_dirs))


def test_create_unique_instance_name(gst: GMSSystemTest) -> None:
    names = [gst.create_unique_instance_name() for _ in range(5)]
    for name in names:
        assert name.startswith("gms-system-test-")
    assert len(names) == len(set(names))


def test_install_instance_skip_stage(
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    gst.parse_args(shlex.split("--instance dummy --stage wait"))
    gst.install_instance()
    captured = capsys.readouterr()
    assert "install" in [_.stage for _ in gst.durations]
    assert "Skipping this stage." in captured.out
    assert gst.durations[-1].duration < timedelta(seconds=1)
    shutil.rmtree(gst.reports_dir)


minio_command = (
    "gmskube augment apply --tag sha1 --name minio-test-reports --set "
    "minioReportBucket=reports --set minioAccessKey=MINIO_ACCESS_KEY --set "
    "minioSecretKey=MINIO_SECRET_KEY instance"
)
expected_commands = [
    (
        "ian",
        [
            "GMS_DISABLE_KEYCLOAK_AUTH=true "
            "ian-sim-deploy --tag-auto sha1 instance development",
            minio_command
        ]
    ),
    (
        "sb",
        [
            "gmskube install --tag sha1 --type sb --augment oracle "
            "--set interactive-analysis-ui.env.GMS_DISABLE_KEYCLOAK_AUTH=true "
            "instance",
            minio_command
        ]
    ),
    (
        "soh",
        [
            "gmskube install --tag sha1 --type soh "
            "--set interactive-analysis-ui.env.NODE_ENV=development "
            "--set interactive-analysis-ui.env.GMS_DISABLE_KEYCLOAK_AUTH=true "
            "instance",
            minio_command
        ]
    )
]


@pytest.mark.parametrize(
    "instance_type, expected",
    expected_commands,
    ids=[_[0] for _ in expected_commands]
)
def test_create_install_commands(
    instance_type: str,
    expected: str,
    gst: GMSSystemTest
) -> None:
    gst.parse_args(
        shlex.split(
            f"--stage install --instance instance --tag sha1 --type "
            f"{instance_type}"
        )
    )
    result = gst.create_install_commands()
    assert result == expected


@pytest.mark.parametrize(
    "instance_type, expected",
    expected_commands,
    ids=[_[0] for _ in expected_commands]
)
@patch("uuid.uuid4")
def test_install_instance(
    mock_uuid4: MagicMock,
    instance_type: str,
    expected: str,
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    mock_uuid4.return_value = "FOO"
    gst.parse_args(
        shlex.split(
            "--dry-run --instance instance --stage install --tag sha1 --type "
            f"{instance_type}"
        )
    )
    gst.install_instance()
    captured = capsys.readouterr()
    for command in expected:
        for word in re.split(" |.|=", command):
            assert word in captured.out
    shutil.rmtree(gst.reports_dir)


@patch("python.kubectl.kubectl.kubectl.KubeCtl.wait_for_all_pods_ready")
def test_check_all_pods_ready_success(
    mock_wait_for_all_pods_ready: MagicMock,
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    mock_wait_for_all_pods_ready.return_value = None
    gst.parse_args(shlex.split("--stage wait"))
    gst.kubectl = KubeCtl("namespace")
    gst.check_all_pods_ready()
    captured = capsys.readouterr()
    assert "ALL PODS READY" in captured.out


@patch("python.kubectl.kubectl.kubectl.KubeCtl.wait_for_all_pods_ready")
def test_check_all_pods_ready_failed(
    mock_wait_for_all_pods_ready: MagicMock,
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    mock_wait_for_all_pods_ready.side_effect = RetryError(Future(1))
    gst.parse_args(shlex.split("--stage wait"))
    gst.kubectl = KubeCtl("namespace")
    gst.check_all_pods_ready()
    captured = capsys.readouterr()
    assert "NOT ALL PODS READY" in captured.out


def test_sleep_after_pods_running(gst: GMSSystemTest) -> None:
    sleep_time = 1
    start_time = time()
    gst.parse_args(shlex.split(f"--stage sleep --sleep {sleep_time}"))
    gst.sleep_after_pods_running()
    assert time() - start_time > sleep_time


@patch("python.kubectl.kubectl.kubectl.KubeCtl.get_configmap_labels")
def test__run_pre_stage_actions_test(
    mock_get_configmap_labels: MagicMock,
    gst: GMSSystemTest
) -> None:
    gst.kubectl = KubeCtl()
    instance_tag = "foo"
    mock_get_configmap_labels.return_value = {"gms/image-tag": instance_tag}
    gst._run_pre_stage_actions_test()
    assert gst.instance_tag == instance_tag
    gst.instance_tag = None
    mock_get_configmap_labels.return_value = None
    with pytest.raises(RuntimeError) as e:
        gst._run_pre_stage_actions_test()
    msg = e.value.args[0]
    assert "Unable to determine the instance tag" in msg


def test_apply_test_augmentation(
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    """
    TODO:  UPDATE AFTER AUTO-TAG DETECTION.
    """
    gst.parse_args(
        shlex.split(
            "--stage test --instance instance --tag sha1 --test test-name "
            "--env 'foo=echo hello world' --parallel 3 --dry-run"
        )
    )
    gst.apply_test_augmentation()
    captured = capsys.readouterr()
    expected = (
        "gmskube augment apply --tag sha1 --name test-name --set "
        "env.foo=\"echo hello world\" --set numIdenticalPods=3 instance"
    )
    for word in expected.split():
        assert word in captured.out


@pytest.mark.parametrize("istio_enabled", [True, False])
@patch("python.kubectl.kubectl.kubectl.KubeCtl.get_endpoints")
@patch("python.kubectl.kubectl.kubectl.KubeCtl.get_resource")
@patch("python.kubectl.kubectl.kubectl.KubeCtl.istio_enabled")
def test__get_minio_endpoint(
    mock_istio_enabled: MagicMock,
    mock_get_resource: MagicMock,
    mock_get_endpoints: MagicMock,
    istio_enabled: bool,
    gst: GMSSystemTest
) -> None:
    gst.kubectl = KubeCtl("namespace")
    gst.kubectl_gms = KubeCtl("other-namespace")
    mock_get_endpoints.return_value = "host.name", ["/"]
    mock_get_resource.return_value = [{
        "data": {
            "istio_port": "12345",
            "nginx_port": "54321"
        }
    }]
    mock_istio_enabled.return_value = istio_enabled
    endpoint = gst._get_minio_endpoint()
    if istio_enabled:
        assert endpoint == "host.name:12345/"
    else:
        assert endpoint == "host.name:54321/"


@patch("python.kubectl.kubectl.kubectl.KubeCtl.get_endpoints")
@patch("python.kubectl.kubectl.kubectl.KubeCtl.get_resource")
def test__get_minio_endpoint_raises(
    mock_get_resource: MagicMock,
    mock_get_endpoints: MagicMock,
    gst: GMSSystemTest
) -> None:
    gst.kubectl = KubeCtl("namespace")
    gst.kubectl_gms = KubeCtl("other-namespace")
    mock_get_endpoints.return_value = None, None
    with pytest.raises(RuntimeError) as e:
        gst._get_minio_endpoint()
    msg = e.value.args[0]
    assert "Failed to locate" in msg
    mock_get_endpoints.return_value = "host.name", ["/"]
    mock_get_resource.return_value = []
    with pytest.raises(RuntimeError) as e:
        gst._get_minio_endpoint()
    msg = e.value.args[0]
    assert "Failed to get the port" in msg


@patch(
    "python.utils.gms_system_test.gms_system_test.gms_system_test."
    "GMSSystemTest._get_minio_endpoint"
)
@patch.object(Minio, "__init__", return_value=None)
def test_minio_client(
    mock_Minio: MagicMock,
    mock__get_minio_endpoint: MagicMock
) -> None:
    """
    TODO:  FIGURE OUT HOW TO MOCK ``Minio()``.
    """
    # gst = GMSSystemTest()
    # mock_get_minio_endpoint.return_value = "host.name:12345/"
    # with pytest.raises(RuntimeError) as e:
    #     gst.get_minio_client()
    # msg = e.value.args[0]
    # assert "Failed to connect to MinIO endpoint" in msg
    assert True


def test_extract_minio_object() -> None:
    """
    TODO:  FIGURE OUT HOW TO UNIT TEST THIS.
    """
    assert True


def test_pod_succeeded() -> None:
    """
    TODO:  FIGURE OUT HOW TO UNIT TEST THIS.
    """
    assert True


def test_retrieve_test_results() -> None:
    """
    TODO:  FIGURE OUT HOW TO UNIT TEST THIS.
    """
    assert True


# @pytest.mark.parametrize("tests", ["", "jest"])
# @pytest.mark.parametrize("env", [[""], ["foo=bar"]])
# def test_run_tests(tests, env, capsys):
def test_run_tests() -> None:
    """
    Todo:
        * Update this once :func:`run_test` has been updated for
          dry-run mode.
    """
    assert True
    # gst = GMSSystemTest(
    #     Namespace(
    #         instance="test-instance",
    #         dry_run=True,
    #         tests=tests,
    #         env=env
    #     )
    # )
    # gst.run_test()
    # captured = capsys.readouterr()
    # assert "gms_test_runner.py" in captured.out
    # assert "--force" in captured.out
    # assert "--reports" in captured.out
    # assert gst.instance_name in captured.out
    # if tests:
    #     assert tests in captured.out
    # if env:
    #     for value in env:
    #         assert value in captured.out


def test_uninstall_instance(
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    instance_name = "instance"
    command = f"gmskube uninstall {instance_name}"
    gst.parse_args(
        shlex.split(f"--stage uninstall --instance {instance_name} --dry-run")
    )
    gst.uninstall_instance()
    captured = capsys.readouterr()
    for word in command.split():
        assert word in captured.out


@patch("python.kubectl.kubectl.kubectl.KubeCtl.save_logs")
def test_keyboard_interrupt_handler(
    mock_save_logs: MagicMock,
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    instance_name = "instance"
    command = f"gmskube uninstall {instance_name}"
    gst.kubectl = KubeCtl(instance_name)
    gst.parse_args(
        shlex.split(
            f"--tag sha1 --type sb --instance {instance_name} --stage install "
            "wait sleep test uninstall --test TEST-NAME --dry-run"
        )
    )
    with pytest.raises(SystemExit) as exc:
        gst.keyboard_interrupt_handler(signal_number=1, stack_frame=None)
    assert exc.value.code == 1
    captured = capsys.readouterr()
    expected = ["Caught a keyboard interrupt signal", command]
    for line in expected:
        for word in line.split():
            assert word in captured.out


def test_raise_parser_error(
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    error_message = (
        "This is a lengthy error message explaining what exactly went wrong, "
        "where, and why.  It's so long it should get wrapped over multiple "
        "lines."
    )
    with pytest.raises(SystemExit):
        gst.raise_parser_error(error_message)
    captured = capsys.readouterr()
    expected = (
        error_message.split() + [
            "usage:",
            "Description",
            "Results",
            "Environment Variables",
            "Examples",
            "options:",
            "Options for specifying the instance to test against",
            "Options for testing"
        ]
    )
    for term in expected:
        assert term in captured.out


@pytest.mark.parametrize(
    "env_args, parallel, expected",
    [(
        ["FOO=BAR"],
        1,
        ['--set env.FOO="BAR"']
    ), (
        ["spaces=echo hello world"],
        1,
        ['--set env.spaces="echo hello world"']
    ), (
        ["check=multiple", "args=okay"],
        1,
        ['--set env.check="multiple"', '--set env.args="okay"']
    ), (
        ["global=here", "test-name.foo=also here", "other-test.bar=missing"],
        1,
        ['--set env.global="here"', '--set env.foo="also here"']
    ), (
        ["FOO=BAR"],
        3,
        ['--set env.FOO="BAR"', '--set numIdenticalPods=3']
    ), (
        [],
        1,
        []
    )]
)  # yapf: disable
def test_create_set_args(
    env_args: str,
    parallel: int,
    expected: str,
    gst: GMSSystemTest
) -> None:
    gst.test_name = "test-name"
    gst.parallel = parallel
    assert gst.create_set_args(env_args) == expected


def test_parse_args(gst: GMSSystemTest) -> None:
    gst.parse_args(
        shlex.split(
            "--env foo=bar --env baz=bif --instance instance --tag my-tag "
            "--type sb --parallel 5 --sleep 123 --test MY-TEST "
            "--test-retry-attempts 8 --test-retry-delay 10 "
            "--test-retry-timeout 54321 --wait-timeout 1200"
        )
    )
    assert gst.instance_name == "instance"
    assert gst.instance_tag == "my-tag"
    assert gst.instance_type == "sb"
    assert gst.parallel == 5
    assert gst.wait_timeout == 1200
    assert gst.set_args == [
        '--set env.foo="bar"',
        '--set env.baz="bif"',
        '--set numIdenticalPods=5'
    ]
    assert gst.sleep == 123
    assert gst.test_name == "MY-TEST"
    assert gst.test_retry_attempts == 8
    assert gst.test_retry_delay == 10
    assert gst.test_retry_timeout == 54321


@pytest.mark.parametrize(
    "args, message", [(
        "--stage test",
        "`--test` flag augment catalog"
    ), (
        "--stage install",
        "specify (1) both `--tag` `--type` (2) `--instance <name>` omit"
    )]
)  # yapf: disable
def test_parse_args_raises(
    args: str,
    message: str,
    gst: GMSSystemTest,
    capsys: pytest.CaptureFixture
) -> None:
    with pytest.raises(SystemExit):
        gst.parse_args(shlex.split(args))
    captured = capsys.readouterr()
    for word in message:
        assert word in captured.out


@pytest.mark.parametrize(
    "tag, expected", [
        ("no-changes", "no-changes"),
        ("TO-LOWER-CASE", "to-lower-case"),
        ("rep!ace-$pecial", "rep-ace--pecial"),
        ("--remove-leading-trailing-----", "remove-leading-trailing"),
        ("this-is-the-tag-that-never-ends-yes-it-goes-on-and-on-my-friend-"
         "some-people-started-typing-it-not-knowing-what-it-was-and-theyll-"
         "continue-typing-it-forever-just-because---",
         "this-is-the-tag-that-never-ends-yes-it-goes-on-and-on-my-friend")
    ]
)  # yapf: disable
def test_argparse_tag_name_type(
    tag: str,
    expected: str
) -> None:
    assert argparse_tag_name_type(tag) == expected


@pytest.mark.parametrize("arg", ["foo=bar", "'var=quotes and spaces'"])
def test_argparse_set_env(arg: str) -> None:
    assert argparse_set_env(arg) == arg


def test_argparse_set_env_raises() -> None:
    with pytest.raises(ArgumentTypeError):
        argparse_set_env("no-equals-sign")
