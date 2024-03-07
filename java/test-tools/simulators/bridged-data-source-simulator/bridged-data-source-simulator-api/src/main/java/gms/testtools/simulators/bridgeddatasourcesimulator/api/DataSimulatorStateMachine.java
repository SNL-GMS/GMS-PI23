package gms.testtools.simulators.bridgeddatasourcesimulator.api;

import com.google.common.annotations.VisibleForTesting;
import com.google.common.graph.Graph;
import com.google.common.graph.GraphBuilder;
import com.google.common.graph.ImmutableGraph;

import static com.google.common.base.Preconditions.checkArgument;

public class DataSimulatorStateMachine {

  public static enum State {
    UNINITIALIZED,
    INITIALIZING,
    INITIALIZED,
    UNINITIALIZING,
    STARTED,
    STOPPED,
    ERROR
  }

  private State currentState;
  private final Graph<State> stateGraph;

  public DataSimulatorStateMachine() {
    this.currentState = State.UNINITIALIZED;
    this.stateGraph = buildStateGraph();
  }

  private static Graph<State> buildStateGraph() {
    ImmutableGraph.Builder<State> graphBuilder = GraphBuilder.directed()
      .expectedNodeCount(State.values().length)
      .immutable();

    for (State state : State.values()) {
      graphBuilder.addNode(state);
    }

    //Initialize
    graphBuilder.putEdge(State.UNINITIALIZED, State.INITIALIZING);
    graphBuilder.putEdge(State.INITIALIZING, State.INITIALIZED);

    //Start
    graphBuilder.putEdge(State.INITIALIZED, State.STARTED);

    //Stop
    graphBuilder.putEdge(State.STARTED, State.STOPPED);

    //Restart
    graphBuilder.putEdge(State.STOPPED, State.STARTED);

    //Cleanups
    graphBuilder.putEdge(State.UNINITIALIZED, State.UNINITIALIZING);
    graphBuilder.putEdge(State.INITIALIZED, State.UNINITIALIZING);
    graphBuilder.putEdge(State.STOPPED, State.UNINITIALIZING);
    graphBuilder.putEdge(State.UNINITIALIZING, State.UNINITIALIZED);

    //Errors
    graphBuilder.putEdge(State.UNINITIALIZED, State.ERROR);
    graphBuilder.putEdge(State.INITIALIZING, State.ERROR);
    graphBuilder.putEdge(State.INITIALIZED, State.ERROR);
    graphBuilder.putEdge(State.UNINITIALIZING, State.ERROR);
    graphBuilder.putEdge(State.STARTED, State.ERROR);
    graphBuilder.putEdge(State.STOPPED, State.ERROR);

    //Error Management
    graphBuilder.putEdge(State.ERROR, State.UNINITIALIZING);
    graphBuilder.putEdge(State.ERROR, State.STOPPED);

    return graphBuilder.build();
  }

  public State getCurrentState() {
    return currentState;
  }

  public void transition(State nextState) {
    checkArgument(isValidTransition(nextState), "Invalid transition %s -> %s", currentState, nextState);
    setCurrentState(nextState);
  }

  public boolean isValidTransition(State nextState) {
    return stateGraph.hasEdgeConnecting(currentState, nextState);
  }

  @VisibleForTesting
  protected void setCurrentState(State nextState) {
    this.currentState = nextState;
  }

}
