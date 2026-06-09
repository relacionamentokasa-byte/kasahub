import { supabase } from "@/integrations/supabase/client";

async function uploadLogo(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
        console.error(`Failed to fetch ${url}: ${res.statusText}`);
        return;
    }
    const blob = await res.blob();
    const { error } = await supabase.storage
      .from("logos")
      .upload(filename, blob, { upsert: true, contentType: blob.type });
    if (error) console.error(`Error uploading ${filename}:`, error);
    else console.log(`Uploaded ${filename}`);
  } catch (e) {
    console.error(`Failed to upload ${filename}:`, e);
  }
}

async function run() {
  const previewUrl = "https://id-preview--621e80b6-8687-4e83-b76c-8896600eb296.lovable.app";
  await uploadLogo(`${previewUrl}/logo-white.png`, "logo-white.png");
  await uploadLogo(`${previewUrl}/logo-yellow.png`, "logo-yellow.png");
}

run();
