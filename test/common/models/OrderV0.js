module.exports = function OrderV0(Model) {
  Model.remoteMethod('SpclOrder', {
    description: 'Remote method to add special order status',
    accessType: 'WRITE',
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Model data to be posted'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    http: {
      verb: 'post',
      path: '/special-order'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.SpclOrder = function specialOrder(data, options, next) {
    if (typeof next === 'undefined') {
      next = options;
      options = {};
    }
    data.specialOrder = true;
    next(null, data);
  };

  Model.remoteMethod('SpclOrderUpdate', {
    description: 'Remote method to add special order status',
    accessType: 'WRITE',
    accepts: [{
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Model data to be posted'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    http: {
      verb: 'put',
      path: '/special-order'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.SpclOrderUpdate = function specialOrderUpdate(data, options, next) {
    if (typeof next === 'undefined') {
      next = options;
      options = {};
    }
    data.specialOrder = true;
    next(null, data);
  };

  Model.remoteMethod('SpclOrderBYId', {
    description: 'Remote method to add special order status',
    accessType: 'WRITE',
    accepts: [{
      arg: 'id',
      type: 'string',
      http: {
        source: 'path'
      },
      description: 'id of the model data'
    }, {
      arg: 'data',
      type: 'object',
      http: {
        source: 'body'
      },
      description: 'Model data to be posted'
    }, {
      arg: 'options',
      type: 'object',
      http: 'optionsFromRequest'
    }],
    http: {
      verb: 'put',
      path: '/special-order/:id'
    },
    returns: {
      arg: 'response',
      type: 'object',
      root: true
    }
  });

  Model.SpclOrderBYId = function specialOrderById(id, data, options, next) {
    if (typeof next === 'undefined') {
      next = options;
      options = {};
    }

    data.id = id;
    data.specialOrder = true;
    Model.create(data, options, next);
  };
};
