'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SchoolView } from '../../components/SchoolView';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { pagePreset } from '../../lib/motion/presets';

export function EscolaNativeClient() {
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
  const isTeacher = userData?.roles?.includes('teacher') || userData?.roles?.includes('Pastor da Sede');

  return (
    <motion.div {...pagePreset} className="container mx-auto px-4 py-24 max-w-7xl mt-8">
      {isLoggedIn ? (
        <SchoolView userRole={userData?.roles || []} isAdmin={isAdmin} />
      ) : (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <h2 className="text-2xl font-bold font-serif italic text-white">Acesso Restrito</h2>
          <p className="text-white/50">Você precisa estar logado para acessar a Escola IDE.</p>
          <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-primary text-black font-bold rounded-full">
            Fazer Login
          </button>
        </div>
      )}
    </motion.div>
  );
}
