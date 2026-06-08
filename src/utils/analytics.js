import ReactGA from "react-ga4";

export const initAnalytics = () => {
  ReactGA.initialize("G-6JFRXKH5LX");
};

export const trackEvent = (action, category = "ObraIA") => {
  ReactGA.event({
    category,
    action,
  });
};

export const pageView = () => {
  ReactGA.send({
    hitType: "pageview",
    page: window.location.pathname,
  });
};