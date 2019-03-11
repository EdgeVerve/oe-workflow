2018-07-30, Version 2.x
=========================
* oe-connector, model name evaluation expression, replace msg('prop') as msg.prop
* User task expressions, replace $variable as ${pv.variable}
* /api/Tasks will NOT filter the records. Use separate API GET /api/Tasks/filtered/
* For task filtering, user group is now taken from options.ctx.group (as opposed to older options.ctx.department)
* Pools and Lanes, now you can use expressions in names to specify dynamic user, group, role.
  e.g. "User:${...}", "Group:${...}", "Role:${...}"

* Sequential Multi-Instance now populates _iteration and elementVariable in inVariables. It can be used in pv(...) expressions.

* Message passed to next node msg.msg should be replaced as msg
2018-01-03, Version 1.2.0
=========================

 * Implementation of Maker Checker Version 2
 * Rework functionality for Maker Checker
 * Additional attributes Due Date, Followup Date and Priority for User Task
 * Input-Output variable mapping for Call Activity and Subprocess

2017-11-17, Version 1.1.1
=========================

 * Process definition relation fix
 * Uninitailzed variables bug fix maker-checker

2017-10-31, Version 1.1.0
=========================

 * Workflow versioning enabled
 * form support on user task
 * duplicate bpmn template fix
 * recovery fix for user task creation
 * /workflow & /task api stability fix
 
2017-10-11, Version 1.0.0
=========================

 * Initial Commit
