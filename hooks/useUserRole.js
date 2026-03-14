import { useEffect, useState } from "react";
import { supabase } from "../supabase";

export const useUserRole = () => {
  const [role, setRole] = useState("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRole("none");
        setLoading(false);
        return;
      }

      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userRole) {
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
