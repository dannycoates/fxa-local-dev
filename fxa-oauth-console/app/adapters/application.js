import Ember from 'ember';
import DS from 'ember-data';
import config from '../config/environment';

export default DS.RESTAdapter.extend({
  namespace: 'v1',
  host: config.servers.oauth,
  headers: Ember.computed(function () {
    return {
      'Authorization': 'Bearer ' + this.get('session.content.token')
    };
  }),
  find: function(store, type, id, record) {
    return this.ajax(this.buildURL(type.typeKey, id, record), 'GET').then(function (resp) {
      resp.id = id;

      return { client: resp };
    });
  },
  createRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);

    serializer.serializeIntoHash(data, type, record, { includeId: true });

    return this.ajax(this.buildURL(type.typeKey, null, record), "POST", { data: data }).then(function (resp) {

      resp.id = resp.client_id;
      delete resp.client_id;

      return { client: resp };
    });
  },
  buildURL: function(type, id, record) {
    var url = [],
      host = this.host,
      prefix = this.urlPrefix();

    if (record) {
      url.push('client');
    } else {
      url.push('clients');
    }

    if (id && !Ember.isArray(id)) { url.push(encodeURIComponent(id)); }

    if (prefix) { url.unshift(prefix); }

    url = url.join('/');
    if (!host && url) { url = '/' + url; }

    return url;
  },
  ajaxError: function(jqXHR) {
    var error = this._super(jqXHR);
    console.log(error);

    return error;
  }
});
