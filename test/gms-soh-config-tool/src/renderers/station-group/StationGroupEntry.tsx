import React, { useRef } from 'react';
import makeStyles from '@mui/styles/makeStyles';
import { useAppSelector } from '../../state/react-redux-hooks';
import { AppSections } from '../../routes/types';
import { determineSectionContainsErrorState } from '../../util/util';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { Checklist } from '../../components/Checklist';
import { StationGroupCapabilityRollup } from '../station-capability-rollup/StationGroupCapabilityRollup';
import { ALL_STATION_GROUP_NAME } from '../station-groups-checklist/util';
import {
  useDeleteStationGroup,
  useUpdateStationsInStationGroup,
} from '../../util/custom-hooks';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAppContext } from '../../state/state';
import { getStationNames } from '../../coi-types/get-stations';
import { useDrag, useDrop } from 'react-dnd/dist/hooks';
import { ItemTypes } from '../../coi-types/data-names';
import { Identifier, XYCoord } from 'dnd-core';
import { IconControls } from '../../components/IconControls';
import { DeleteIconButton } from '../../components/DeleteIconButton';

const useStyles = makeStyles({
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    width: '100%',
    fontSize: '20px',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    margin: '1em',
  },
  capabilityRollup: {
    alignSelf: 'flex-start',
    width: '400px',
    textAlign: 'right',
    cursor: 'pointer',
    margin: '.6em',
  },
  isDragging: {
    opacity: '50%',
  },
  deleteIcon: {
    fontSize: '1em',
    backgroundColor: 'red',
    borderRadius: '1em',
    color: 'white',
    opacity: '.5',
    '&:hover': {
      opacity: '1',
    },
  },
  deleteIconDisabled: {
    fontSize: '1em',
    backgroundColor: 'grey',
    borderRadius: '1em',
    color: 'white',
    opacity: '.5',
    '&:hover': {
      opacity: '1',
    },
  },
  accordion: {
    alignSelf: 'flex-start',
    width: '30%',
    marginBottom: '.5em',
    minWidth: '200px',
  },
  accordionLabel: {
    alignSelf: 'flex-start',
    fontWeight: 'bold',
    color: '#666666',
  },
  errorBorder: {
    border: 'solid',
    borderWidth: '2px',
    borderColor: 'tomato',
  },
});

interface DragItem {
  index: number;
  id: string;
  type: string;
}

/**
 * The type of the props for the {@link StationGroupEntry} component
 */
export interface StationGroupEntryProps {
  groupName: string;
  index: number;

  moveGroupEntry: (dragIndex: number, hoverIndex: number) => void;
}

/**
 * An entry for a station group used in the Station Groups tab
 */
export const StationGroupEntry: React.FC<StationGroupEntryProps> = (
  props: StationGroupEntryProps
) => {
  const { data: appData } = useAppContext();
  const ref = useRef<HTMLDivElement>(null);
  const { groupName, index, moveGroupEntry } = props;
  const classes = useStyles();
  const errors = useAppSelector((state) => state.stationControls.error);
  const groupsWithIncludedStations = useAppSelector(
    (store) => store.stationControls.groupsWithIncludedStations
  );
  const stationList: string[] = React.useMemo(() => {
    return getStationNames(appData?.processingStationGroups).sort() ?? [];
  }, [appData?.processingStationGroups]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const updateStationsInStationGroup = useUpdateStationsInStationGroup();
  const deleteStationGroup = useDeleteStationGroup();
  const hasErrors =
    determineSectionContainsErrorState(
      errors,
      `${AppSections.STATION_GROUPS} ${groupName}`
    ).length > 0;

  /**
   * Updates state when an accordion is toggled
   */
  const handleAccordionClick = React.useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);
  const [, drop] = useDrop<DragItem, void, { handlerId: Identifier | null }>({
    accept: ItemTypes.GROUP,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragItem, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY =
        (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveGroupEntry(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.GROUP,
    item: () => {
      return { groupName, index };
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));
  return (
    <>
      <IconControls
        key={groupName}
        controls={[
          <DeleteIconButton
            key={`delete-button-${groupName}`}
            className={
              hasErrors ? classes.deleteIconDisabled : classes.deleteIcon
            }
            containerId={groupName}
            isDisabled={hasErrors}
            helpText={
              hasErrors
                ? 'Fix all errors to enable delete'
                : `Delete group ${groupName}`
            }
            onIconClick={(containerId: string) =>
              deleteStationGroup(containerId)
            }
          />,
        ]}
      >
        <div
          ref={ref}
          className={`${classes.container} ${
            isDragging ? classes.isDragging : ''
          }`}
          key={groupName}
        >
          <Accordion
            className={` ${classes.accordion}   ${
              hasErrors ? classes.errorBorder : ''
            }`}
            onClick={() => handleAccordionClick()}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <strong className={classes.accordionLabel}>{groupName}</strong>
            </AccordionSummary>
            <AccordionDetails>
              Stations:
              {isExpanded ? (
                <Checklist
                  checkboxes={stationList ?? []}
                  checkedBoxes={
                    groupName === ALL_STATION_GROUP_NAME
                      ? stationList
                      : groupsWithIncludedStations[groupName]
                  }
                  handleToggle={(newlySelected, checkbox) =>
                    updateStationsInStationGroup(
                      newlySelected,
                      checkbox,
                      groupName
                    )
                  }
                  nonIdealState={'No station groups found'}
                />
              ) : undefined}
            </AccordionDetails>
          </Accordion>
          <div className={classes.capabilityRollup}>
            <StationGroupCapabilityRollup groupName={groupName} />
          </div>
        </div>
      </IconControls>
    </>
  );
};
