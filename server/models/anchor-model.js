'use strict';
const Async = require('async');
const Boom = require('boom');
const Joi = require('joi');
const MongoModels = require('hicsail-mongo-models');

class AnchorModel extends MongoModels {

  static create(document, callback) {

    const self = this;

    self.applyDefaultValues(document);

    Async.auto({
      validate: function (done) {

        Joi.validate(document, self.schema, done);
      },
      insert: ['validate', function (results, done) {

        self.applyAnchorValues(document);
        self.insertOne(document,done);
      }]
    }, (err, result) => {

      if (err) {
        return callback(err);
      }

      callback(null, result.insert[0]);
    });
  }


  static get(request, reply) {

    const query = {};
    const fields = request.query.fields;
    const sort = request.query.sort;
    const limit = request.query.limit;
    const page = request.query.page;

    request.pre.model.pagedFind(query, fields, sort, limit, page, (err, results) => {

      if (err) {
        return reply(err);
      }

      reply(results);
    });
  }


  static update(request, reply) {

    const self = this;
    const id = request.params.id;

    if (self.settings.timestamps) {
      request.payload.updatedAt = new Date();
    }

    const update = {
      $set: request.payload
    };

    request.pre.model.findByIdAndUpdate(id, update, (err, document) => {

      if (err) {
        return reply(err);
      }

      if (!document) {
        return reply(Boom.notFound('Document not found.'));
      }

      reply(document);
    });
  }

  static applyDefaultValues(document) {}

  static applyAnchorValues(document) {

    const self = this;
    if (self.settings.timestamps) {
      document.createdAt = document.createdAt || new Date();
    }
  }
}

AnchorModel.settings = {
  timestamps: true,  //add CreatedAt and UpdatedAt timestamps to your model. Default true
  userId: true,  //storeUserId
  getScope: ['root','admin','researcher'],
  postScope: null,
  updateScope: ['root','admin'],
  deleteScope: ['root','admin']
};

module.exports = AnchorModel;
