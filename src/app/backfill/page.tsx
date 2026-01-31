"use client";

import { useExchange } from "@/contexts/ExchangeContext";
import { BackfillHeader, BackfillTabs, BackfillMessages, ExchangeAccountSelector } from "@/components/backfill";
import SyncSymbolsSection from "@/components/backfill/SyncSymbolsSection";
import SymbolsTable from "@/components/backfill/SymbolsTable";
import BackfillJobsTable from "@/components/backfill/BackfillJobsTable";
import BatchBackfillTab from "@/components/backfill/BatchBackfillTab";
import { useBackfillData } from "@/components/backfill/hooks/useBackfillData";

export default function BackfillPage() {
     const { selectedAccountId } = useExchange();
     
     const {
          // State
          currentTab,
          setCurrentTab,
          jobs,
          batchJobs,
          backups,
          markets,
          loading,
          error,
          setError,
          success,
          setSuccess,
          formData,
          setFormData,
          batchFormData,
          setBatchFormData,
          processing,
          autoProcessingJobs,
          symbolsLoading,
          dataStatus,
          syncingAll,
          syncAllResults,
          showSyncAllResults,
          setShowSyncAllResults,
          exchanges,
          selectedExchangeName,
          setSelectedExchangeName,
          syncingExchange,
          syncExchangeResult,
          showSyncExchangeResult,
          setShowSyncExchangeResult,
          searchQuery,
          setSearchQuery,
          statusFilter,
          setStatusFilter,
          intervalFilter,
          setIntervalFilter,
          jobSearchQuery,
          setJobSearchQuery,
          jobStatusFilter,
          setJobStatusFilter,
          jobIntervalFilter,
          setJobIntervalFilter,
          availableIntervals,
          filteredMarkets,
          // Functions
          fetchMarkets,
          syncSymbols,
          syncAllExchanges,
          syncSpecificExchange,
          fetchDataStatus,
          fetchJobs,
          fetchBackups,
          startBackfillForSymbol,
          handleRestart,
          handleStart,
          handlePause,
          handleUpdate,
          toggleAutoProcess,
          handleCreateBackup,
          handleRestoreBackup,
          handleStartBatch,
          handleProcessBatch,
          getStatusColor,
          calculateProgress,
     } = useBackfillData(selectedAccountId);

     return (
          <div style={{ padding: "0 16px", maxWidth: "1870px", margin: "0 auto", color: "#ededed", minHeight: "100vh" }}>
               <BackfillHeader />
               <BackfillTabs 
                    currentTab={currentTab}
                    setCurrentTab={setCurrentTab}
               />
               <BackfillMessages error={error} success={success} />
               <ExchangeAccountSelector selectedAccountId={selectedAccountId} />
               <SyncSymbolsSection
                    selectedAccountId={selectedAccountId}
                    markets={markets}
                    symbolsLoading={symbolsLoading}
                    syncingAll={syncingAll}
                    syncingExchange={syncingExchange}
                    selectedExchangeName={selectedExchangeName}
                    setSelectedExchangeName={setSelectedExchangeName}
                    exchanges={exchanges}
                    syncSymbols={syncSymbols}
                    syncAllExchanges={syncAllExchanges}
                    syncSpecificExchange={syncSpecificExchange}
                    showSyncAllResults={showSyncAllResults}
                    setShowSyncAllResults={setShowSyncAllResults}
                    syncAllResults={syncAllResults}
                    showSyncExchangeResult={showSyncExchangeResult}
                    setShowSyncExchangeResult={setShowSyncExchangeResult}
                    syncExchangeResult={syncExchangeResult}
               />

               {/* All Symbols Table - For Download */}
               {currentTab === "symbols" && (
                    <SymbolsTable
                         selectedAccountId={selectedAccountId}
                         markets={markets}
                         dataStatus={dataStatus}
                         jobs={jobs}
                         backups={backups}
                         availableIntervals={availableIntervals}
                         searchQuery={searchQuery}
                         setSearchQuery={setSearchQuery}
                         statusFilter={statusFilter}
                         setStatusFilter={setStatusFilter}
                         intervalFilter={intervalFilter}
                         setIntervalFilter={setIntervalFilter}
                         filteredMarkets={filteredMarkets}
                         loading={loading}
                         processing={processing}
                         fetchMarkets={fetchMarkets}
                         fetchDataStatus={fetchDataStatus}
                         startBackfillForSymbol={startBackfillForSymbol}
                         handleRestoreBackup={handleRestoreBackup}
                         setSuccess={setSuccess}
                         setError={setError}
                    />
               )}

               {/* Single Backfill Tab */}
               {currentTab === "single" && (
                    <BackfillJobsTable
                         jobs={jobs}
                         backups={backups}
                         availableIntervals={availableIntervals}
                         jobSearchQuery={jobSearchQuery}
                         setJobSearchQuery={setJobSearchQuery}
                         jobStatusFilter={jobStatusFilter}
                         setJobStatusFilter={setJobStatusFilter}
                         jobIntervalFilter={jobIntervalFilter}
                         setJobIntervalFilter={setJobIntervalFilter}
                         processing={processing}
                         autoProcessingJobs={autoProcessingJobs}
                         formData={formData}
                         setFormData={setFormData}
                         fetchJobs={fetchJobs}
                         fetchBackups={fetchBackups}
                         fetchDataStatus={fetchDataStatus}
                         handlePause={handlePause}
                         handleRestart={handleRestart}
                         handleStart={handleStart}
                         handleCreateBackup={handleCreateBackup}
                         handleUpdate={handleUpdate}
                         toggleAutoProcess={toggleAutoProcess}
                         calculateProgress={calculateProgress}
                         getStatusColor={getStatusColor}
                    />
               )}

               {/* Batch Backfill Tab */}
               {currentTab === "batch" && (
                    <BatchBackfillTab
                         markets={markets}
                         availableIntervals={availableIntervals}
                         batchFormData={batchFormData}
                         setBatchFormData={setBatchFormData}
                         batchJobs={batchJobs}
                         loading={loading}
                         processing={processing}
                         handleStartBatch={handleStartBatch}
                         handleProcessBatch={handleProcessBatch}
                    />
               )}
          </div>
     );
}
