"use client";

import dynamic from "next/dynamic";
import styles from "@/styles/page.module.scss";

const MultiStreamViewer = dynamic(
  () =>
    import("@/components/multi-stream-viewer").then(
      (module) => module.MultiStreamViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className={styles.viewerBootstrap}>
        <div className={styles.viewerBootstrapPanel}>
          <p className={styles.eyebrow}>Loading workspace</p>
          <h1>Preparing your multi-stream viewer…</h1>
        </div>
      </div>
    ),
  },
);

export default function Home() {
  return <MultiStreamViewer />;
}
