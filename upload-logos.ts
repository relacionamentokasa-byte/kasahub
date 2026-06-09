import { supabase } from "@/integrations/supabase/client";

async function uploadLogo(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const { error } = await supabase.storage
      .from("logos")
      .upload(filename, blob, { upsert: true, contentType: blob.type });
    if (error) console.error(`Error uploading ${filename}:`, error);
    else console.log(`Uploaded ${filename}`);
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e);
  }
}

async function run() {
  // URLs based on current code / usual locations
  await uploadLogo("https://id-preview--621e80b6-8687-4e83-b76c-8896600eb296.lovable.app/logo-white.png", "logo-white.png");
  await uploadLogo("https://id-preview--621e80b6-8687-4e83-b76c-8896600eb296.lovable.app/logo-yellow.png", "logo-yellow.png");
}

run();
