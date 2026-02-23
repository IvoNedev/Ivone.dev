import React, { useEffect, useRef } from 'react';

const AdBanner = () => {
    const adRef = useRef(null);

    useEffect(() => {
        if (adRef.current && adRef.current.offsetWidth > 0) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    return (
        <div
            ref={adRef}
            style={{
                display: 'inline-block',
                width: '320px',   // Fixed width for your ad unit; adjust as needed.
                height: '50px',   // Short banner height; adjust this value for a shorter or taller banner.
                margin: '0 auto', // Center the ad horizontally.
            }}
        >
            <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '100%' }}
                data-ad-client="ca-pub-6479977081378145"
                data-ad-slot="3528321086"
                data-ad-format="auto"
                data-full-width-responsive="true"
                data-adtest={window.location.hostname === 'localhost' ? "on" : undefined}
            ></ins>
        </div>
    );
};

export default AdBanner;
