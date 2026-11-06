import { Suspense } from 'react';
import { requireStudentAppUser, getWebsiteSettings } from '@/lib/auth/session';
import { getPublishedTaxonomyBundle } from '@/lib/taxonomy';
import { getActiveAdvertisementsByPlacement } from '@/lib/ads';
import { MaterialsBrowserClient } from '@/components/student/MaterialsBrowserClient';

export const metadata = {
  title: 'Study Materials Library',
};

export default async function StudyMaterialsPage() {
  const [profile, taxonomy, settings, adConfig] = await Promise.all([
    requireStudentAppUser(),
    getPublishedTaxonomyBundle(),
    getWebsiteSettings(),
    getActiveAdvertisementsByPlacement(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="h-96 animate-pulse rounded-lg border border-line bg-neutral-soft" />
      }
    >
      <MaterialsBrowserClient
        profile={profile}
        taxonomy={taxonomy}
        onlyQuestionPapers={false}
        allowCrossProgrammeBrowsing={settings.allow_cross_programme_browsing}
        adsEnabled={adConfig.adsEnabled}
        requireAdConsent={adConfig.requireConsent}
        betweenListingsAd={adConfig.byPlacement.between_listings}
        subjectPageAd={adConfig.byPlacement.subject_page}
      />
    </Suspense>
  );
}
