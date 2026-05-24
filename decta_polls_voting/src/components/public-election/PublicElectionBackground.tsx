"use client";

import React from 'react';

interface ElectionBackgroundConfig {
  banner_url?: string | null;
}

interface ElectionBackgroundRecord {
  banner?: string | null;
}

export function getPublicElectionBackgroundImage(
  siteConfig?: ElectionBackgroundConfig | null,
  election?: ElectionBackgroundRecord | null
) {
  return siteConfig?.banner_url || election?.banner || null;
}

export function PublicElectionBackgroundLayer({ imageUrl }: { imageUrl?: string | null }) {
  if (!imageUrl) {
    return (
      <div className="absolute inset-0 z-0 bg-white" />
    );
  }

  return (
    <>
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 z-0 bg-white/45" />
    </>
  );
}
