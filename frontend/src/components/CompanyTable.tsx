import { DataGrid } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, addCompaniesToLikedCollection, removeCompaniesFromLikedCollection, getLikedCollectionId } from "../utils/jam-api";

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [likedCollectionId, setLikedCollectionId] = useState<string>("");

  useEffect(() => {
    // Get the liked collection ID once on component mount
    getLikedCollectionId()
      .then(setLikedCollectionId)
      .catch(error => {
        console.error("Failed to get liked collection ID:", error);
      });
  }, []);

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

  const handleRemoveFromLiked = async () => {
    if (selectedRows.length === 0) return;
    
    try {
      // Convert selected row IDs to numbers
      const companyIds = selectedRows.map(id => parseInt(id));
      
      // Remove companies from the liked collection
      await removeCompaniesFromLikedCollection(companyIds);
      
      console.log(`Successfully removed ${companyIds.length} companies from liked collection`);

      // Clear selection
      setSelectedRows([]);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error("Failed to remove companies from liked collection:", error);
    }
  };

  const isLikedCollection = props.selectedCollectionId === likedCollectionId;

  return (
    <div>
      {selectedRows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {isLikedCollection ? (
            <Button 
              variant="contained" 
              color="error"
              onClick={handleRemoveFromLiked}
            >
              Remove From Liked ({selectedRows.length})
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleAddToLiked}
            >
              Add to Liked ({selectedRows.length})
            </Button>
          )}
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
