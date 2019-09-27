/**
 *
 * ©2016-2017 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function Modeler(Modeler) {
  Modeler.flows = function flows(options, next) {
    var filter = {
      where: {
        'latest': true
      },
      fields: ['name']
    };
    Modeler.app.models.WorkflowDefinition.find(filter, options,
      function fetchWD(err, wfDefns) {
        if (err) {
          return next(err);
        }

        return next(null, wfDefns.map(item => item.name));
      });
  };

  Modeler.remoteMethod('flows', {
    description: 'Get flow list',
    accessType: 'READ',
    accepts: [{
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    http: {
      verb: 'get',
      path: '/flows'
    },
    returns: {
      arg: 'data',
      type: 'object',
      root: true
    }
  });
};
