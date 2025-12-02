import { useEffect, useState } from "react";
import { getUTMParams, UTMParams } from "@/lib/utm";

export const useUTM = () => {
  const [utmParams, setUtmParams] = useState<UTMParams>({});

  useEffect(() => {
    // Captura UTMs ao montar o hook
    const params = getUTMParams();
    setUtmParams(params);
  }, []);

  return utmParams;
};
