import { redirect } from "next/navigation";
import { SETTINGS_PROFILE_HREF } from "@coddle/shared";

export default function ProfileEditorPage() {
  redirect(SETTINGS_PROFILE_HREF);
}
