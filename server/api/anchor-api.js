'use strict';
const Boom = require('boom');
const Joi = require('joi');
const Path = require('path');
let models = {};

const internals = {};


internals.applyRoutes = function (server, next) {

  server.route({
    method: 'GET',
    path: '/api/{model}',
    config: {
      auth: {
        strategies: ['simple', 'jwt', 'session']
      },
      pre: [{
        assign: 'model',
        method: function (request, reply) {

          const path = models[request.params.model];

          if (!path) {

            return reply(Boom.notFound('Model not found'));
          }

          const model = require(Path.join(__dirname,'../..',models[request.params.model]));
          reply(model);
        }
      }, {
        assign: 'scope',
        method: function (request, reply) {

          const model = request.pre.model;
          const userScope = request.auth.credentials.user.roles;
          const routeScopes = model.settings.getScope;

          if (!routeScopes) {
            reply(true);
          }

          for (const scope of routeScopes) {
            if (userScope[scope]) {
              return reply(true);
            }
          }

          return reply(Boom.unauthorized('User does not have correct permissions.'));
        }
      }]
    },
    handler: function (request, reply) {

      request.pre.model.get(request, reply);

    }
  });

  server.route({
    method: 'POST',
    path: '/api/{model}',
    config: {
      auth: {
        strategies: ['simple', 'jwt', 'session']
      },
      pre: [{
        assign: 'model',
        method: function (request, reply) {

          const path = models[request.params.model];

          if (!path) {

            return reply(Boom.notFound('Model not found'));
          }

          const model = require(Path.join(__dirname,'../..',models[request.params.model]));
          reply(model);
        }
      }, {
        assign: 'scope',
        method: function (request, reply) {

          const model = request.pre.model;
          const userScope = request.auth.credentials.user.roles;
          const routeScopes = model.settings.getScope;

          if (!routeScopes) {
            reply(true);
          }

          for (const scope of routeScopes) {
            if (userScope[scope]) {
              return reply(true);
            }
          }

          return reply(Boom.unauthorized('User does not have correct permissions.'));
        }
      }, {
        assign: 'payload',
        method: function (request, reply) {

          const model = request.pre.model;
          Joi.validate(request.payload, model.payload, (err, result) => {

            if (err) {
              return reply(Boom.conflict(err.message));
            }

            reply(true);
          });
        }
      }]
    },
    handler: function (request, reply) {

      const model = request.pre.model;
      const document = request.payload;


      if (model.settings.userId) {
        document.userId = request.auth.credentials.user._id.toString();
      }

      request.pre.model.create(document, (err, result) => {

        if (err) {
          return reply(err);
        }

        reply(result);
      });

    }
  });


  server.route({
    method: 'PUT',
    path: '/api/{model}/{id}',
    config: {
      auth: {
        strategies: ['simple', 'jwt', 'session']
      },
      pre: [{
        assign: 'model',
        method: function (request, reply) {

          const path = models[request.params.model];

          if (!path) {

            return reply(Boom.notFound('Model not found'));
          }

          const model = require(Path.join(__dirname,'../..',models[request.params.model]));
          reply(model);
        }
      }, {
        assign: 'scope',
        method: function (request, reply) {

          const model = request.pre.model;
          const userScope = request.auth.credentials.user.roles;
          const routeScopes = model.settings.getScope;

          if (!routeScopes) {
            reply(true);
          }

          for (const scope of routeScopes) {
            if (userScope[scope]) {
              return reply(true);
            }
          }

          return reply(Boom.unauthorized('User does not have correct permissions.'));
        }
      },{
        assign: 'payload',
        method: function (request, reply) {

          const model = request.pre.model;
          Joi.validate(request.payload, model.payload, (err, result) => {

            if (err) {
              return reply(Boom.conflict(err.message));
            }

            reply(true);
          });
        }
      }]
    },
    handler: function (request, reply) {

      request.pre.model.update(request, reply);

    }
  });

  next();
};

exports.register = function (server, options, next) {

  models = options.models || {};
  server.dependency(['auth', 'hicsail-hapi-mongo-models'], internals.applyRoutes);
  next();

};

exports.register.attributes = {
  name: 'anchor-cron'
};
