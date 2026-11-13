// Web stand-in for @stripe/stripe-react-native, which only runs on phones.
// It lets the web version open for testing. No real payment happens on web.
const React = require('react');

function StripeProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

const NOT_ON_WEB = {
  error: { code: 'Failed', message: 'Payments only work in the phone app.' },
};

function useStripe() {
  return {
    // While developing, the payment sheet is skipped so a job can be posted for testing.
    // In a real (production) web build, paying is refused.
    initPaymentSheet: async () => (__DEV__ ? {} : NOT_ON_WEB),
    presentPaymentSheet: async () => (__DEV__ ? {} : NOT_ON_WEB),
  };
}

module.exports = { StripeProvider, useStripe };
