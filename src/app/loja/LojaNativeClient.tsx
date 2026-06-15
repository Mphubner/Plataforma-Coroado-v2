'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { StoreView } from '../../components/StoreView';
import { auth } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { pagePreset } from '../../lib/motion/presets';

export function LojaNativeClient() {
  const [userData, setUserData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const token = await user.getIdTokenResult();
        const profileType = token.claims.profileType || 'member';
        const roles = token.claims.roles || [];
        setUserData({
          id: user.uid,
          tenantId: token.claims.tenantId,
          roles,
          profileType,
        });
      } else {
        setIsLoggedIn(false);
        setUserData(null);
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, []);

  if (loadingUser) {
    return (
      <div className="flex justify-center py-20">
        <span className="animate-pulse text-white/50">Carregando...</span>
      </div>
    );
  }

  const isAdmin = userData?.roles?.includes('admin') || userData?.profileType === 'admin';

  return (
    <motion.div {...pagePreset} className="container mx-auto px-4 py-24 max-w-7xl mt-8">
      <StoreView isAdmin={isAdmin} userData={userData} />
    </motion.div>
  );
}
