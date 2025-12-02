import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export type UserRole = "admin" | "teacher" | "super_admin" | "none";

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      // Gets the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRole("none");
        setLoading(false);
        return;
      }

      // Checks what role they have in the database
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userRole) {
        // Both admin and super_admin get treated as 'admin'
        if (userRole.role === "admin" || userRole.role === "super_admin") {
          setRole("admin");
        } else {
          setRole("teacher");
        }
      } else {
        setRole("none");
      }

      setLoading(false);
    };

    checkRole();
  }, []);

  return { role, loading };
};

export default () => null;
