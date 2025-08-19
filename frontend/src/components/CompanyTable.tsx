import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, addCompaniesToLikedCollection } from "../utils/jam-api";

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    getCollectionsById(props.selectedCollectionId, offset, pageSize).then(
      (newResponse) => {
        setResponse(newResponse.companies);
        setTotal(newResponse.total);
      }
    );
  }, [props.selectedCollectionId, offset, pageSize, refreshTrigger]);

  useEffect(() => {
    setOffset(0);
  }, [props.selectedCollectionId]);

  const handleAddToLiked = async () => {
    if (selectedRows.length === 0) return;
    
    try {
      // Convert selected row IDs to numbers
      const companyIds = selectedRows.map(id => parseInt(id));
      
      // Add companies to the liked collection
      await addCompaniesToLikedCollection(companyIds);
      
      console.log(`Successfully added ${companyIds.length} companies to liked collection`);

      // Clear selection
      setSelectedRows([]);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error("Failed to add companies to liked collection:", error);
    }
  };

  return (
    <div>
      {selectedRows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleAddToLiked}
          >
            Add to Liked ({selectedRows.length})
          </Button>
        </div>
      )}
      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={response}
          rowHeight={30}
          columns={[
            { field: "liked", headerName: "Liked", width: 90 },
            { field: "id", headerName: "ID", width: 90 },
            { field: "company_name", headerName: "Company Name", width: 200 },
          ]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 },
            },
          }}
          rowCount={total}
          pagination
          checkboxSelection
          paginationMode="server"
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection as string[]);
          }}
          onPaginationModelChange={(newMeta) => {
            setPageSize(newMeta.pageSize);
            setOffset(newMeta.page * newMeta.pageSize);
          }}
        />
      </div>
    </div>
  );
};

export default CompanyTable;
