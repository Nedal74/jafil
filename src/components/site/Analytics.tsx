import Script from "next/script";

/**
 * Loads GTM and/or GA4 with Google Consent Mode v2. Analytics storage starts
 * "denied" and is granted only after the visitor accepts in the consent banner.
 * IDs come from the dashboard (Integrations) and are validated server-side.
 */
export function Analytics({ ga4, gtm }: { ga4: string; gtm: string }) {
  if (!ga4 && !gtm) return null;
  const consentDefault = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var c = null; try { c = localStorage.getItem('aljafil-consent'); } catch (e) {}
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: c === 'granted' ? 'granted' : 'denied', wait_for_update: 500
});
`;
  return (
    <>
      {/* Inline so consent defaults are set before any Google tag loads. */}
      <script id="consent-default" dangerouslySetInnerHTML={{ __html: consentDefault }} />
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(gtm)});`}
        </Script>
      )}
      {ga4 && !gtm && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`gtag('js', new Date()); gtag('config', ${JSON.stringify(ga4)});
// Forward custom dataLayer events to GA4 when GTM is not used.
(function(){var dl=window.dataLayer;var push=dl.push.bind(dl);dl.push=function(o){var r=push(o);if(o&&typeof o==='object'&&!Array.isArray(o)&&o.event&&!String(o.event).startsWith('gtm')){var p=Object.assign({},o);delete p.event;gtag('event',o.event,p);}return r;};})();`}
          </Script>
        </>
      )}
    </>
  );
}
