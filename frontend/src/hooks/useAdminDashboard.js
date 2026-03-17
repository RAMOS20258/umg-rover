import { useCallback, useEffect, useState } from "react";
import { adminService } from "../services/adminService";

const EMPTY_STATS = {
  usuarios: 0,
  programas: 0,
  simulaciones: 0,
  errores: 0,
};

export function useAdminDashboard() {
  const [tab, setTab] = useState("accesos");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(EMPTY_STATS);
  const [accesos, setAccesos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [errores, setErrores] = useState([]);
  const [credenciales, setCredenciales] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [
        statsData,
        accesosData,
        conductoresData,
        evidenciasData,
        erroresData,
        credencialesData,
      ] = await Promise.all([
        adminService.getStats(),
        adminService.getAccesos(),
        adminService.getConductores(),
        adminService.getEvidencias(),
        adminService.getErrores(),
        adminService.getCredenciales(),
      ]);

      setStats(statsData || EMPTY_STATS);
      setAccesos(Array.isArray(accesosData) ? accesosData : []);
      setConductores(Array.isArray(conductoresData) ? conductoresData : []);
      setEvidencias(Array.isArray(evidenciasData) ? evidenciasData : []);
      setErrores(Array.isArray(erroresData) ? erroresData : []);
      setCredenciales(Array.isArray(credencialesData) ? credencialesData : []);
    } catch (error) {
      console.error("Error cargando admin dashboard:", error);
      setStats(EMPTY_STATS);
      setAccesos([]);
      setConductores([]);
      setEvidencias([]);
      setErrores([]);
      setCredenciales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    tab,
    setTab,
    loading,
    stats,
    accesos,
    conductores,
    evidencias,
    errores,
    credenciales,
    fetchData,
  };
}