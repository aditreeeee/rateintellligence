import { createContext, useContext, useMemo, useState, useCallback } from "react";

import companiesSeed from "../data/companies.json";
import propertiesSeed from "../data/properties.json";
import roomsSeed from "../data/rooms.json";
import ratePlansSeed from "../data/rateplans.json";
import masterDataSeed from "../data/masterData.json";
import competitorsSeed from "../data/competitors.json";

const DataContext = createContext(null);

function nextId(prefix, existing) {
  const nums = existing
    .map((x) => parseInt(String(x.id).replace(/\D/g, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(prefix === "PROP" ? 6 : 3, "0")}`;
}

export function DataProvider({ children }) {
  const [companies] = useState(companiesSeed);
  const [properties, setProperties] = useState(propertiesSeed);
  const [rooms, setRooms] = useState(roomsSeed);
  const [ratePlans, setRatePlans] = useState(ratePlansSeed);
  const [masterData, setMasterData] = useState(masterDataSeed);
  const [competitors] = useState(competitorsSeed);

  const company = companies[0];

  const benchmarkProperty = useMemo(
    () => properties.find((p) => p.isBenchmark) || properties[0],
    [properties]
  );

  const getPropertyById = useCallback((id) => properties.find((p) => p.id === id), [properties]);
  const getRoomById = useCallback((id) => rooms.find((r) => r.id === id), [rooms]);
  const getRoomsByProperty = useCallback((propertyId) => rooms.filter((r) => r.propertyId === propertyId), [rooms]);
  const getRatePlanById = useCallback((id) => ratePlans.find((rp) => rp.id === id), [ratePlans]);
  const getRatePlansByRoom = useCallback((roomId) => ratePlans.filter((rp) => (rp.roomIds || []).includes(roomId)), [ratePlans]);
  const getRatePlansByProperty = useCallback((propertyId) => ratePlans.filter((rp) => rp.propertyId === propertyId), [ratePlans]);

  const isRoomNameTaken = useCallback(
    (propertyId, name, excludeId = null) =>
      rooms.some(
        (r) => r.propertyId === propertyId && r.id !== excludeId && r.name.trim().toLowerCase() === name.trim().toLowerCase()
      ),
    [rooms]
  );

  const isRatePlanNameTaken = useCallback(
    (propertyId, name, excludeId = null) =>
      ratePlans.some(
        (rp) => rp.propertyId === propertyId && rp.id !== excludeId && rp.name.trim().toLowerCase() === name.trim().toLowerCase()
      ),
    [ratePlans]
  );

  const createProperty = useCallback((data) => {
    const id = nextId("PROP", properties);
    const record = {
      id,
      companyId: company.id,
      isBenchmark: properties.length === 0,
      notes: [],
      updatedAt: new Date().toISOString().slice(0, 10),
      ...data,
    };
    setProperties((prev) => [...prev, record]);
    return record;
  }, [properties, company]);

  const updateProperty = useCallback((id, patch) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : p)));
  }, []);

  const setBenchmarkProperty = useCallback((id) => {
    setProperties((prev) => prev.map((p) => ({ ...p, isBenchmark: p.id === id })));
  }, []);

  const addPropertyNote = useCallback((propertyId, text, author = "Aditree Admin", tag = "General") => {
    setProperties((prev) =>
      prev.map((p) =>
        p.id === propertyId
          ? {
              ...p,
              notes: [
                { id: `NOTE-${Date.now()}`, author, date: new Date().toISOString().slice(0, 10), tag, text },
                ...p.notes,
              ],
            }
          : p
      )
    );
  }, []);

  const createRoom = useCallback((data) => {
    const id = nextId("RM", rooms);
    const today = new Date().toISOString().slice(0, 10);
    const record = {
      id, status: "Active", notes: [],
      createdBy: company.owner.name, createdDate: today, modifiedDate: today,
      ...data,
    };
    setRooms((prev) => [...prev, record]);
    return record;
  }, [rooms, company]);

  const updateRoom = useCallback((id, patch) => {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch, modifiedDate: new Date().toISOString().slice(0, 10) } : r)));
  }, []);

  const deleteRoom = useCallback((id) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    setRatePlans((prev) =>
      prev
        .map((rp) => ({ ...rp, roomIds: (rp.roomIds || []).filter((rid) => rid !== id) }))
        .filter((rp) => rp.roomIds.length > 0)
    );
  }, []);

  const duplicateRoom = useCallback((id) => {
    const source = rooms.find((r) => r.id === id);
    if (!source) return null;
    const newId = nextId("RM", rooms);
    const today = new Date().toISOString().slice(0, 10);
    const copy = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      status: "Inactive",
      notes: [],
      createdBy: company.owner.name,
      createdDate: today,
      modifiedDate: today,
      displayOrder: rooms.filter((r) => r.propertyId === source.propertyId).length + 1,
    };
    setRooms((prev) => [...prev, copy]);
    return copy;
  }, [rooms, company]);

  const addRoomNote = useCallback((roomId, text, author = "Aditree Admin") => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, notes: [{ id: `NOTE-${Date.now()}`, author, date: new Date().toISOString().slice(0, 10), text }, ...(r.notes || [])] }
          : r
      )
    );
  }, []);

  const createRatePlan = useCallback((data) => {
    const id = nextId("RP", ratePlans);
    const today = new Date().toISOString().slice(0, 10);
    const record = {
      id, status: "Active", notes: [],
      createdBy: company.owner.name, createdDate: today, modifiedDate: today,
      ...data,
    };
    setRatePlans((prev) => [...prev, record]);
    return record;
  }, [ratePlans, company]);

  const updateRatePlan = useCallback((id, patch) => {
    setRatePlans((prev) => prev.map((rp) => (rp.id === id ? { ...rp, ...patch, modifiedDate: new Date().toISOString().slice(0, 10) } : rp)));
  }, []);

  const deleteRatePlan = useCallback((id) => {
    setRatePlans((prev) => prev.filter((rp) => rp.id !== id));
  }, []);

  const duplicateRatePlan = useCallback((id) => {
    const source = ratePlans.find((rp) => rp.id === id);
    if (!source) return null;
    const newId = nextId("RP", ratePlans);
    const today = new Date().toISOString().slice(0, 10);
    const copy = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      status: "Draft",
      notes: [],
      pricingPeriods: source.pricingPeriods.map((pp, i) => ({ ...pp, id: `PP-${newId.slice(3)}-${i + 1}` })),
      createdBy: company.owner.name,
      createdDate: today,
      modifiedDate: today,
    };
    setRatePlans((prev) => [...prev, copy]);
    return copy;
  }, [ratePlans, company]);

  const addRatePlanNote = useCallback((ratePlanId, text, author = "Aditree Admin") => {
    setRatePlans((prev) =>
      prev.map((rp) =>
        rp.id === ratePlanId
          ? { ...rp, notes: [{ id: `NOTE-${Date.now()}`, author, date: new Date().toISOString().slice(0, 10), text }, ...(rp.notes || [])] }
          : rp
      )
    );
  }, []);

  // ---- Shared company configuration lists (amenities, meal plans, occupancies, etc.) ----
  // Frontend-only for now; every record is shaped to map directly onto a future SQL Server
  // table: unique id, companyId, name, description, status, createdBy, createdDate, modifiedDate.
  const isConfigNameTaken = useCallback(
    (listKey, name, excludeId = null) =>
      (masterData[listKey] || []).some(
        (item) => item.id !== excludeId && item.name.trim().toLowerCase() === name.trim().toLowerCase()
      ),
    [masterData]
  );

  const addConfigItem = useCallback((listKey, fields) => {
    const list = masterData[listKey] || [];
    const id = nextId(listKey.slice(0, 3).toUpperCase(), list);
    const today = new Date().toISOString().slice(0, 10);
    const record = {
      id,
      companyId: company.id,
      status: "Active",
      description: "",
      createdBy: company.owner.name,
      createdDate: today,
      modifiedDate: today,
      ...fields,
    };
    setMasterData((prev) => ({ ...prev, [listKey]: [...(prev[listKey] || []), record] }));
    return record;
  }, [masterData, company]);

  const updateConfigItem = useCallback((listKey, id, patch) => {
    setMasterData((prev) => ({
      ...prev,
      [listKey]: (prev[listKey] || []).map((item) =>
        item.id === id ? { ...item, ...patch, modifiedDate: new Date().toISOString().slice(0, 10) } : item
      ),
    }));
  }, []);

  const deleteConfigItem = useCallback((listKey, id) => {
    setMasterData((prev) => ({ ...prev, [listKey]: (prev[listKey] || []).filter((item) => item.id !== id) }));
  }, []);

  const value = useMemo(
    () => ({
      company,
      companies,
      properties,
      rooms,
      ratePlans,
      masterData,
      competitors,
      benchmarkProperty,
      getPropertyById,
      getRoomById,
      getRoomsByProperty,
      getRatePlanById,
      getRatePlansByRoom,
      getRatePlansByProperty,
      isRoomNameTaken,
      isRatePlanNameTaken,
      createProperty,
      updateProperty,
      setBenchmarkProperty,
      addPropertyNote,
      createRoom,
      updateRoom,
      deleteRoom,
      duplicateRoom,
      addRoomNote,
      createRatePlan,
      updateRatePlan,
      deleteRatePlan,
      duplicateRatePlan,
      addRatePlanNote,
      isConfigNameTaken,
      addConfigItem,
      updateConfigItem,
      deleteConfigItem,
    }),
    [
      company, companies, properties, rooms, ratePlans, masterData, competitors, benchmarkProperty,
      getPropertyById, getRoomById, getRoomsByProperty, getRatePlanById, getRatePlansByRoom, getRatePlansByProperty,
      isRoomNameTaken, isRatePlanNameTaken, createProperty, updateProperty, setBenchmarkProperty,
      addPropertyNote, createRoom, updateRoom, deleteRoom, duplicateRoom, addRoomNote,
      createRatePlan, updateRatePlan, deleteRatePlan, duplicateRatePlan, addRatePlanNote,
      isConfigNameTaken, addConfigItem, updateConfigItem, deleteConfigItem,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
