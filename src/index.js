import superagent from 'superagent';
import cookie from 'react-cookie';
import { parse as parseUrl } from 'url';

import config from '@plone/volto/registry';

export const getAPIResourceWithAuth = (req) => {
  return new Promise((resolve, reject) => {
    const internalApiUrl = parseUrl(
      config.settings.internalApiPath || config.settings.apiPath,
    );
    const apiUrl = parseUrl(config.settings.apiPath);
    const publicUrl = parseUrl(config.settings.publicURL);
    const reqPath = req.path.replace('/@@rdf', '');
    const protocol = apiUrl.protocol.slice(0, apiUrl.protocol.length - 1);
    const path = `/VirtualHostBase/${protocol}/${publicUrl.host}${apiUrl.path}/VirtualHostRoot${reqPath}`;
    const url = `${internalApiUrl.protocol}//${internalApiUrl.host}${path}`;
    const request = superagent.get(url).buffer().type('text');
    const authToken = cookie.load('auth_token');
    if (authToken) {
      request.set('Authorization', `Bearer ${authToken}`);
    }
    request.end((error, res) => {
      if (error) {
        return resolve(res || error);
      }
      return resolve(res.text);
    });
  });
};

export default (config) => {
  if (__SERVER__) {
    const express = require('express');
    const middleware = express.Router();

    middleware.all('**/@@rdf', function (req, res, next) {
      getAPIResourceWithAuth(req).then((resource) => {
        res.set('Content-Type', 'text/plain');
        res.send(resource);
      });
    });
    middleware.id = 'rdf-proxy-middleware';

    config.settings.expressMiddleware = [
      ...config.settings.expressMiddleware,
      middleware,
    ];
  }
  return config;
};
