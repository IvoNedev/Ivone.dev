import React, { useEffect } from 'react';

function AdBanner() {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) { console.error(e); }
    }, []);

    return (
        <ins className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-XXXXXXXXXXXXXXX"
            data-ad-slot="YYYYYYYYYY"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
    );
}

export default AdBanner;
