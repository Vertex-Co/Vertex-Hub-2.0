import { useMemo } from "react";
import { useCompany } from "../contexts/CompanyContext";
export function usePermissions(){
 const{companyRole,isSuperAdmin}=useCompany();
 return useMemo(()=>{
  const owner=isSuperAdmin||companyRole==="company_owner";
  const administrator=owner||companyRole==="admin";
  return{isReadOnly:!administrator,canWrite:administrator,canManageCompany:administrator,canManageMembers:administrator,canTransferOwnership:owner,canUsePlatformAdmin:isSuperAdmin};
 },[companyRole,isSuperAdmin]);
}
