'use client';

import dynamic from 'next/dynamic';

const CoroadoApp = dynamic(() => import('../App'), {
  ssr: false,
});

export default function NextClientApp() {
  return <CoroadoApp />;
}
