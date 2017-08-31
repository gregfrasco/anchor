'use strict';
const AuthPlugin = require('../../../server/auth');
const Code = require('code');
const Config = require('../../../config');
const Hapi = require('hapi');
const HapiAuthBasic = require('hapi-auth-basic');
const HapiAuthCookie = require('hapi-auth-cookie');
const Lab = require('lab');
const MailerPlugin = require('../../../server/mailer');
const MakeMockModel = require('../fixtures/make-mock-model');
const Manifest = require('../../../manifest');
const Path = require('path');
const Proxyquire = require('proxyquire');
const SignupPlugin = require('../../../server/api/signup');


const lab = exports.lab = Lab.script();
let request;
let server;
let stub;


lab.before((done) => {

  stub = {
    Session: MakeMockModel(),
    User: MakeMockModel()
  };

  const proxy = {};
  proxy[Path.join(process.cwd(), './server/models/session')] = stub.Session;
  proxy[Path.join(process.cwd(), './server/models/user')] = stub.User;

  const ModelsPlugin = {
    register: Proxyquire('hapi-mongo-models', proxy),
    options: Manifest.get('/registrations').filter((reg) => {

      if (reg.plugin &&
        reg.plugin.register &&
        reg.plugin.register === 'hapi-mongo-models') {

        return true;
      }

      return false;
    })[0].plugin.options
  };

  const plugins = [HapiAuthBasic, HapiAuthCookie, AuthPlugin, ModelsPlugin, MailerPlugin, SignupPlugin];
  server = new Hapi.Server();
  server.connection({ port: Config.get('/port/web') });
  server.register(plugins, (err) => {

    if (err) {
      return done(err);
    }

    server.initialize(done);
  });
});


lab.after((done) => {

  server.plugins['hapi-mongo-models'].MongoModels.disconnect();

  done();
});

lab.experiment('Signup Plugin', () => {

  lab.beforeEach((done) => {

    request = {
      method: 'POST',
      url: '/signup',
      payload: {
        name: 'Muddy Mudskipper',
        username: 'muddy',
        password: 'dirtandWater1',
        email: 'mrmud@mudmail.mud',
        application: 'Test'
      }
    };

    done();
  });

  lab.test('it returns an error when find one fails for username check', (done) => {

    stub.User.findOne = function (conditions, callback) {

      if (conditions.username) {
        callback(Error('find one failed'));
      }
      else {
        callback();
      }
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });


  lab.test('it returns a conflict when find one hits for username check', (done) => {

    stub.User.findOne = function (conditions, callback) {

      if (conditions.username) {
        callback(null, {});
      }
      else {
        callback(Error('find one failed'));
      }
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });


  lab.test('it returns an error when find one fails for email check', (done) => {

    stub.User.findOne = function (conditions, callback) {

      if (conditions.email) {
        callback(Error('find one failed'));
      }
      else {
        callback();
      }
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });


  lab.test('it returns a conflict when find one hits for email check', (done) => {

    stub.User.findOne = function (conditions, callback) {

      if (conditions.email) {
        callback(null, {});
      }
      else {
        callback();
      }
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });

  lab.test('it returns a conflict when password dont meet requirements', (done) => {

    stub.User.findOne = function (conditions, callback) {

      callback(null, {});
    };

    request = {
      method: 'POST',
      url: '/signup',
      payload: {
        name: 'Muddy Mudskipper',
        username: 'muddy',
        password: 'notagoodpassword',
        email: 'mrmud@mudmail.mud',
        application: 'Test'
      }
    };
    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(409);

      done();
    });
  });


  lab.test('it returns an error if any critical setup step fails', (done) => {

    stub.User.findOne = function (conditions, callback) {

      callback();
    };

    stub.User.create = function (username, password, email, name, info, callback) {

      callback(Error('create failed'));
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(500);

      done();
    });
  });


  lab.test('it finishes successfully (even if sending welcome email fails)', (done) => {

    stub.User.findOne = function (conditions, callback) {

      callback();
    };

    stub.User.create = function (username, password, email, name, info, callback) {

      callback(null, { _id: 'BL4M0' });
    };

    stub.User.findByIdAndUpdate = function (id, update, callback) {

      callback(null, [{}, {}]);
    };

    const realSendEmail = server.plugins.mailer.sendEmail;
    server.plugins.mailer.sendEmail = function (options, template, context, callback) {

      callback(new Error('Whoops.'));
    };

    stub.Session.create = function (username, application, callback) {

      callback(null, {});
    };

    const realWarn = console.warn;
    console.warn = function () {

      console.warn = realWarn;

      done();
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(200);
      Code.expect(response.result).to.be.an.object();

      server.plugins.mailer.sendEmail = realSendEmail;
    });
  });


  lab.test('it finishes successfully', (done) => {

    stub.User.findOne = function (conditions, callback) {

      callback();
    };

    stub.User.create = function (username, password, email, name, info, callback) {

      callback(null, { _id: 'BL4M0' });
    };

    stub.User.findByIdAndUpdate = function (id, update, callback) {

      callback(null, [{}, {}]);
    };

    const realSendEmail = server.plugins.mailer.sendEmail;
    server.plugins.mailer.sendEmail = function (options, template, context, callback) {

      callback(null, {});
    };

    stub.Session.create = function (username, application, callback) {

      callback(null, {});
    };

    server.inject(request, (response) => {

      Code.expect(response.statusCode).to.equal(200);
      Code.expect(response.result).to.be.an.object();

      server.plugins.mailer.sendEmail = realSendEmail;

      done();
    });
  });
});
