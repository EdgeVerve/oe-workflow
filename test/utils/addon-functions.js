module.exports = {
  testCreation: function preCreateFunction(taskDef, taskData, cb) {
    if (this._processVariables.testingHook && this._processVariables.sla) {
      let date = new Date(Date.now());
      taskData.dueDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + this._processVariables.sla));
    }
    return cb(null, taskData);
  },
  testCompletion: function preCompleteFunction(payload, taskInstance, taskDef, cb) {
    let err = null;
    if (this._processVariables.testingHook && !payload.__comments__) {
      err = new Error('Comments must be provided');
    }
    return cb(err);
  },

  defaultTaskCreationHook: function defaultTaskCreationHook(taskDef, taskData, cb) {
    if (this._processVariables.testingHook) {
      let date = new Date(Date.now());
      taskData.dueDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 2));
      taskData.excludedRoles = ['a', 'b', 'c'];
    }
    return cb(null, taskData);
  },
  defaultTaskCompletionHook: function defaultTaskCompletionHook(payload, taskInstance, taskDef, cb) {
    let err = null;
    if (this._processVariables.testingHook && !payload.__comments__) {
      err = new Error('Default: Comments must be provided');
    }
    return cb(err);
  }
};
