# GMS PI 23 Release Notes
Please reference the related user's guides for more detailed information.

Prepared by Sandia National Laboratories, SAND2024-02468O

## 1. Fixes
### 1.1 SOH
#### Environmental Drill Down Display
* Added back None Filter Type for Channel Filters in order to fix issues with Channels disappearing when no Environmental Issues where included in the rollup to a Channel
#### Trend Displays
* Split Trend Display plot into different data segments when Unknown data was encountered thus properly showing gaps in the data
### 1.2 SOH Configuration Tool
* Fixed issue on Capability Rollups in which changing Rollup Type does not clear error that gets hidden by change
### 1.3 IAN
#### Event List Display
* Removed event details option on right-click context menu
#### Filter Display
* Filter List dropdown selection populates properly based on the configured interval
#### General
* Golden Layout tab label names that overflow to other tabs when shrinking down displays to extremely small sizes are hidden from view
* Updated UI to properly name filtered derived channels created in the UI
#### Map Display
* Signal detections associated to events outside of an open time range are properly color-coded in the Waveform Display, SD list #### Display & Map Display   
* Updated Map Display to consider phase alignment offset when synced to Waveform visible time range is enabled
#### SD List Display
* Signal detections associated to events outside of an open time range are properly color-coded
* Updated the SD List Display to consider phase alignment offset when synced to Waveform visible time range is enabled
Station Properties Display
* Station Properties display does not crash when selecting a row in the Channel Group Configuration Table
#### Waveform Display
* Predictions, including those outside of the configured common default phases, are cleared on the Waveform Display when changing events or phase to align to
* Waveforms that are not part of the loaded time interval are not displayed in the Waveform Display when aligning on phase and/or changing phase alignment
* Sta/chan dist/az labels utilize the correct calculation
* Waveform display zoom does not change when user switches back and forth between Waveform Display tab and another display tab 
* ZAS only executes on default configured alignment phase for button and when opening an event 
* Waveform display timeline properly updates without the need to scroll down when toggling between time & phase alignment/changing events 
* Signal detections associated to events outside of an open time range are properly color-coded based on their association status on load in the Waveform Display
  * Note: these events are not shown in the event list display
* When amplitude scaling 'Fixed: Current' is selected in the amplitude scaling dropdown, scaling remains fixed when zooming in/out 
* Updated QC segment start/end time dots to overlay properly on waveforms
#### Workflow Display
* When the Workflow Display is hidden, unhidden, or repositioned, the horizontal scroll bar retains its position
* Loading QC segments does not cause UI to crash when opening another interval/re-opening an interval
 
## 2. New Features
### 2.1 SOH
#### General
* Environmental issues are only calculated for stations configured for them
  * Shows Non-Ideal State messages for Stations not configured to receive Environmental Issues
  * Stations configured for Environmental Issues but with no data in window or which are not reporting environmental issues will show as Unknown/Marginal
* Color coded channel names on drill down display based on status
  * Good = Green
  * Yellow = Marginal
  * Red = Bad
  * Unknown = Yellow Hashed
* Show gaps in Lag Trends when hitting unknown
* Non-contributing monitory types and channels are shown as semi-transparent to indicate their exclusion
* Filters automatically revert after selecting a new station
### 2.2 SOH Configuration Tool
#### General
* An easy toggle switch was added to include/remove environmental issues for a station
* Added ability to View/Edit/Save/Validate Stations in a Station Group
* Added ability to View/Edit/Save/Validate Station Group Capability Rollup
* Users are now able to Add/Remove/Reorder Station Groups
### 2.3 IAN
#### FK Prototype
* FK algorithms utilize new FK COI
* Adding an FK from a selected signal detection is additive, i.e., selecting another one does not remove your previously selected SD
#### General
* IAN & SOH UI user login is authenticated through Keycloak  
* Improved WASM filtering algorithm performance, about a 70x speedup
* Group delay and taper variables configurable in UI processing configuration for filtering algorithm
* A utility exists to create derived filter channel objects that were created in the UI
* UI Filter Processor Filter Operation exists to design IIR & Cascade filters on-the-fly and apply IIR & Cascade filters
* When users select one or more signal detections or one or more stations/channels, a right-click context menu option exists allowing them to export the waveform data associated to that signal detection from the Waveform Display (menu only)
* Informs user when entering a non-ideal state via a non-ideal state message when attempting to open multiple versions of the same display
#### Map Display
* Brightening effect added on signal detection hover for non-selected SDs
#### Waveform Display
* Added ability to apply an un-named filter via selection/hotkey in the Filter Display & view filtered waveforms 
* Analysts can select which QC masks are visible in the Waveform Display using a QC mask menu button in the Waveform Display toolbar
  * QC mask visibility is selectable for each QC class. Of which the following QC categories exist within the menu:
    * Analyst defined
    * Data authentication
    * Long term
    * Rejected
    * Station SOH
    * Unprocessed
    * Waveform
    * Processing Mask
* Select a QC segment within a menu when QC segments overlap to view additional metadata information
* Added ability to view QC Segment details in menu 
* When users select one or more stations/channels and clicks on the ‘Export’ option via the right-click context menu the waveform data associated to those channels is written out to a file on their local computer in JSON format 
  * The user file includes channel segment metadata & waveform data
* When an event is opened, analysts can align on non-default observed and predicted phases
  * If non-default phase, will retrieve predictions and display them in the UI
  * UI aligns based on the selected observed phase if the channel has that phase associated to the currently open event, otherwise it uses the predicted phase
* Zones left blank by shifted waveforms are colored differently than the waveforms in order to distinguish shifted zones from zones of missing data
* Updated Waveform Display redux state to include phase alignment offsets & non-default feature predictions
#### Workflow Display
* Users can close previously opened intervals without having to re-open them again when the workflow display refreshes or is closed
* Scrollbar updated to function like all other scrollbars in the IAN UI
## 3. Known Issues
### 3.1 SOH
#### Station Overview Display 
* Rendering Issue When Trend Display Open Causes Stations to Show No Capability Status 
Station Statistics Display
* Rendering Issue When Trend Display Open Causes Stations to Show No Capability Status 
#### Map Display
* Map stacking order can cause the station color to appear to change. 
  * This is due to how Cesium layers in the 3D map view, sometimes appearing to be alternating colors between stations that are close together. Zooming in reveals there is more than one station and resolves the issue. 
#### Drill Down Displays
* Header row in Environmental Drill Display blinks 
* Quiet Timer gets misaligned after changing display size 
* Quiet Timer gets misaligned when acknowledging station causing quieting timer on un-shown stations
#### Trend Displays
* Trend displays only show 1 digit of precision
#### System Messages Display
* System message sound configuration menu does not always play a configured sound when applied to a given SOH message
  * The same sound can be selected for more than one type of SOH message and is heard by user