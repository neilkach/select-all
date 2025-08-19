import { DataGrid } from "@mui/x-data-grid";
import { Button, LinearProgress, Box, Typography, Alert } from "@mui/material";
import { useEffect, useState } from "react";
import { getCollectionsById, ICompany, addCompaniesToLikedCollection, removeCompaniesFromLikedCollection, getLikedCollectionId, getCollectionCompanyIds } from "../utils/jam-api";

const CompanyTable = (props: { selectedCollectionId: string }) => {
  const [response, setResponse] = useState<ICompany[]>([]);
  const [total, setTotal] = useState<number>();
  const [offset, setOffset] = useState<number>(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [likedCollectionId, setLikedCollectionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [operationType, setOperationType] = useState<"add" | "remove" | null>(null);
  const [operationCount, setOperationCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);

  // Constants for time estimation (based on 100ms per item database delay)
  const MS_PER_ITEM = 100;
  const UPDATE_INTERVAL = 100; // Update progress every 100ms

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

  // Timer effect for progress updates (only for add operations)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isLoading && startTime && operationType === "add") {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, UPDATE_INTERVAL);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, startTime, operationType]);

  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getEstimatedTimeRemaining = (): string => {
    if (!operationCount || !elapsedTime) return "";
    
    const totalEstimatedTime = operationCount * MS_PER_ITEM;
    const remainingTime = Math.max(0, totalEstimatedTime - elapsedTime);
    
    return formatTime(remainingTime);
  };

  const getProgressPercentage = (): number => {
    if (!operationCount || !elapsedTime) return 0;
    
    const totalEstimatedTime = operationCount * MS_PER_ITEM;
    const progress = Math.min(100, (elapsedTime / totalEstimatedTime) * 100);
    
    return Math.round(progress);
  };

  const handleAddToLiked = async () => {
    if (selectedRows.length === 0) return;
    
    const companyIds = selectedRows.map(id => parseInt(id));
    const count = companyIds.length;
    
    setIsLoading(true);
    setShowCompleted(false);
    setIsCancelled(false);
    setOperationType("add");
    setOperationCount(count);
    setStartTime(Date.now());
    setElapsedTime(0);
    
    try {
      // Add companies to the liked collection
      await addCompaniesToLikedCollection(companyIds);
      
      // Check if operation was cancelled
      if (isCancelled) {
        console.log('Operation was cancelled, not completing');
        return;
      }
      
      console.log(`Successfully added ${count} companies to liked collection`);

      // Clear selection
      setSelectedRows([]);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Show completed state briefly
      setIsLoading(false);
      setShowCompleted(true);
      setOperationType(null);
      setStartTime(null);
      setTimeout(() => setShowCompleted(false), 2000);
      
    } catch (error) {
      console.error("Failed to add companies to liked collection:", error);
      setIsLoading(false);
      setOperationType(null);
      setStartTime(null);
    }
  };

  const handleSelectAll = async () => {
    try {
      // Fetch only company IDs using the lightweight endpoint
      const companyIds = await getCollectionCompanyIds(props.selectedCollectionId);
      
      // Convert to string array to match the selectedRows state type
      const allCompanyIdStrings = companyIds.map(id => id.toString());
      
      // Set selected rows to all companies
      setSelectedRows(allCompanyIdStrings);
      
      console.log(`Selected all ${companyIds.length} companies from collection`);
    } catch (error) {
      console.error('Failed to select all companies:', error);
      // You might want to show an error message to the user here
    }
  };

  const handleClearSelections = () => {
    setSelectedRows([]);
    console.log('Cleared all selections');
  };

  const handleCancelOperation = () => {
    setIsCancelled(true);
    setIsLoading(false);
    setOperationType(null);
    setStartTime(null);
    setElapsedTime(0);
    console.log('Operation cancelled by user');
  };

  const handleRemoveFromLiked = async () => {
    if (selectedRows.length === 0) return;
    
    const companyIds = selectedRows.map(id => parseInt(id));
    const count = companyIds.length;
    
    setIsLoading(true);
    setShowCompleted(false);
    setOperationType("remove");
    setOperationCount(count);
    // Don't set startTime for remove operations - no detailed progress tracking
    
    try {
      // Remove companies from the liked collection
      await removeCompaniesFromLikedCollection(companyIds);
      
      console.log(`Successfully removed ${count} companies from liked collection`);

      // Clear selection
      setSelectedRows([]);
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
      
      // Show completed state briefly
      setIsLoading(false);
      setShowCompleted(true);
      setOperationType(null);
      setTimeout(() => setShowCompleted(false), 2000);
      
    } catch (error) {
      console.error("Failed to remove companies from liked collection:", error);
      setIsLoading(false);
      setOperationType(null);
    }
  };

  const isLikedCollection = props.selectedCollectionId === likedCollectionId;

  return (
    <div>
      {/* Time estimate warning for large selections - only for add operations */}
      {selectedRows.length > 0 && !isLoading && !isLikedCollection && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            You've selected {selectedRows.length} companies. 
            This operation will take approximately {formatTime(selectedRows.length * MS_PER_ITEM)} to complete.
          </Typography>
        </Alert>
      )}

      {/* Progress bar with detailed feedback - only for add operations */}
      {(isLoading || showCompleted) && operationType === "add" && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate"
                value={showCompleted ? 100 : getProgressPercentage()}
                color={showCompleted ? "success" : "primary"}
              />
            </Box>
            <Box sx={{ minWidth: 120 }}>
              <Typography variant="body2" color="text.secondary">
                {showCompleted ? "100%" : `${getProgressPercentage()}%`}
              </Typography>
            </Box>
          </Box>
          
          {/* Detailed status information */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {isLoading 
                ? `Adding ${operationCount} companies...`
                : `Added ${operationCount} companies successfully!`
              }
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isLoading && (
                <Typography variant="body2" color="text.secondary">
                  {getEstimatedTimeRemaining()} remaining
                </Typography>
              )}
              
              {isLoading && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small"
                  onClick={handleCancelOperation}
                >
                  Cancel
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Simple status for remove operations - no progress bar */}
      {(isLoading || showCompleted) && operationType === "remove" && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isLoading 
              ? `Removing ${operationCount} companies...`
              : `Removed ${operationCount} companies successfully!`
            }
          </Typography>
        </Box>
      )}
      
      <div style={{ marginBottom: 16, display: 'flex', gap: 2, alignItems: 'center' }}>
        {selectedRows.length === 0 ? (
          <Button 
            variant="outlined"
            onClick={handleSelectAll}
            disabled={isLoading}
          >
            Select All ({total || 0})
          </Button>
        ) : (
          <Button 
            variant="outlined"
            onClick={handleClearSelections}
            disabled={isLoading}
          >
            Clear Selections
          </Button>
        )}
        
        {selectedRows.length > 0 && (
          <>
            {isLikedCollection ? (
              <Button 
                variant="contained" 
                color="error"
                onClick={handleRemoveFromLiked}
                disabled={isLoading}
              >
                Remove From Liked ({selectedRows.length})
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleAddToLiked}
                disabled={isLoading}
              >
                Add to Liked ({selectedRows.length})
              </Button>
            )}
          </>
        )}
      </div>
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
