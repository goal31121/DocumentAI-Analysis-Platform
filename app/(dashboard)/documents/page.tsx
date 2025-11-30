'use client';

import { DocumentUploader } from '@/components/document/DocumentUploader';
import { DocumentList } from '@/components/document/DocumentList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { Tour, DEFAULT_TOUR_STEPS } from '@/components/onboarding/Tour';
import { useKeyboardShortcuts, COMMON_SHORTCUTS } from '@/lib/hooks/useKeyboardShortcuts';
// import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  // const router = useRouter();

  const handleUploadComplete = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.UPLOAD,
      action: () => {
        const uploadTab = document.querySelector('[value="upload"]') as HTMLElement;
        uploadTab?.click();
      },
    },
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <p className="text-muted-foreground">Manage and analyze your documents</p>
      </div>

      <Tabs
        defaultValue="upload"
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger
            value="upload"
            data-tour="upload"
          >
            Upload
          </TabsTrigger>
          <TabsTrigger
            value="list"
            data-tour="documents"
          >
            My Documents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload">
          <DocumentUploader onUploadComplete={handleUploadComplete} />
        </TabsContent>
        <TabsContent value="list">
          <DocumentList key={refreshKey} />
        </TabsContent>
      </Tabs>

      <Tour steps={DEFAULT_TOUR_STEPS} />
    </div>
  );
}
