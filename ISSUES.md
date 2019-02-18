* Parallel-Gateway-Tests (With Timer)
  When a timer-task is added after Script05, the parallel-gateway sometime hangs.
  It was observed that sometime only 4 PGOut events received and process waits 
  for the 5th one before resuming.
  At some times, all 5 PGOut tokens have received but End event would never trigger.
  Never observed this hanging after removing the timer.

* Parallel-Gateway-Tests (No Timer)
  The current set of tests with 5 parallel scripts, consistently prints 
  `trying to make invalid state change` error message **4 times**. It looks like,
  end-token is being added 5 times and only 1 would succeed (?).

* User-Task Complete 
  Code appears to be selecting process-instance and process-definition in 
  Task.complete(Task.complete_) functions. This (atleast the process-definition)
  need not be selected again in ProcessInstance.completeTask.

* Designer Issue
  In an exclusive-gateway, the default path need not have any condition-expression.
  But when such bpmn file is loaded, the property panel shows error for script-format field `must provide a value`

* Convergence of Inclusive Gateway
  Looks like not supported. All branches execute independently and follow the entire remaining path.
                  ______A____
      [s]-----[ig]______B____[ig]--[e]
 
  Above diagram takes s -> IG -> (A-IG-E) as well as (B-IG-E) 
  rather than S->IG-(A & B)->IG->E 
  i.e. converging Inclusive-Gateway (and subsequent nodes) are executed for each path.

# WorkflowSignal.broadcast
  Selects all `WorkflowSignal` instance by name and selects (`findById`) all corresponding `ProcessInstance`. If the instance is running it sends an `INTERMEDIATE_CATCH_EVENT` event to it.
  The (potential) issue is, `WorkflowSignal` records are never removed. So the broadcast function selecting signals by name will select all old signals and for each old signal it will select the process-instance and ignore it as this may have completed. There by making the engine slowly sluggish.

# MessageStart Events do not work as expected
  * MessageStart seems to be starting even before the message has been received.
  * Designer also seems to be showing invalid editor for MessageStart event

# Call-Activity Designer Input/Output-Parameters
  * Call-Activity node in designer does not have means to specify below data and hence this part is not tested fully. (Refer call-activity-main.bpmn: Line#23-26)
  ``` xml
  <camunda:inputOutput>
    <camunda:inputParameter name="Input1">Awesome</camunda:inputParameter>
    <camunda:outputParameter name="output">Double Awesome</camunda:outputParameter>
  </camunda:inputOutput>
  ```

  # Designer Issue
   * Send Message node does not allow configuration
  
  # Sending Message on Lane-Boundary does not work (check Internal-Messaging tests)
    * Should be able to define the new message-code for the Send Message node.
    * Currently only Connectors are appearing (not completely supported, don't see test cases)

  # Result-variables in script node
    * Camunda implements camunda:expression and camunda:resultVariable
    * the expression is evaluated and result is set as PV[resultVariable]
    * Not implemented in OE_Workflow but present in designer.
    //Possibly input/output(step) variables can be used for same purpose.

  # Call-Activity Variable Mappings - What is Type (Source, Source Expression, All)

  # Workflow-Mapping - related-data and implicit post functionality (What is it)?

  # Maker-Checker-v1 (What are privilegedUsers and privilegedRoles), do we need it in v2?

  # What is the reason we are not executing all 'before save' and only executing data-personalization before-save mixin?

  # For EventBasedGateway Tests
    The expected flow is timer1 expires first and throws a signal that caught and other event-listeners (Timer2 and Signal1) are interrupted.
    However, sometime timer2 is expiring first and marking MCatch & Signal1 as interrupted. 
    Later on, when timer1 expires and throws signal the MCatch block continues and tries to mark itself as 'Complete'. This is wrong.
    1. The workflow should be fixed to extend the timer2 expiry duration. So that we execute the flow as expected.
    2. Second, we should check WHY the Signal-Catch event should resume if catch-token is already interrupted?

So one case when we get 'trying to make invalid state change' is when signal block is resuming when it is already interrupted.
Also for inclusive gateway since there's no converging node available, we've put two END nodes. I feel when both legs are executing and one leg completes all the way till end... the end causes tokens in other legs to get interrupted (even when it is on-the-run). Subsequently when node tries to update itself as complete, we get trying to make invalid state change error.
