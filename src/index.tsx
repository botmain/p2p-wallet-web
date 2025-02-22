import './wdyr';
import 'sanitize.css';
import 'styles/css/nprogress.css';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { IntercomProvider } from 'react-use-intercom';

import assert from 'ts-invariant';

import { FeatureProvider } from 'components/common/FeatureProvider';
import { isDev } from 'config/constants';
import { store } from 'store';
import { globalCss } from 'styles/global';
import { initAmplitude } from 'utils/analytics';

initAmplitude();

export const global = globalCss;

const render = () => {
  // Load the app dynamically, which allows for hot-reloading in development mode.
  const App = require('./App').default as React.FC;

  assert(
    process.env.REACT_APP_INTERCOM_APP_ID,
    "REACT_APP_INTERCOM_APP_ID doesn't set in environment",
  );

  ReactDOM.render(
    <React.StrictMode>
      <Provider store={store}>
        <IntercomProvider appId={process.env.REACT_APP_INTERCOM_APP_ID} autoBoot>
          <FeatureProvider>
            <App />
          </FeatureProvider>
        </IntercomProvider>
      </Provider>
    </React.StrictMode>,
    document.querySelector('#root'),
  );
};

render();

// Allow the hot-reloading of the App in development mode
if (isDev && module.hot) {
  module.hot.accept('./App', render);
}
