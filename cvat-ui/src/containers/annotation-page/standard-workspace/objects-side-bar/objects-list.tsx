// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { GlobalHotKeys, KeyMap } from 'react-hotkeys';

import { SelectValue } from 'antd/lib/select';

import ObjectsListComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-list';
import {
    updateAnnotationsAsync,
    fetchAnnotationsAsync,
    changeAnnotationsFilters as changeAnnotationsFiltersAction,
    collapseObjectItems,
} from 'actions/annotation-actions';

import {
    CombinedState,
    StatesOrdering,
} from 'reducers/interfaces';

interface StateToProps {
    jobInstance: any;
    frameNumber: any;
    listHeight: number;
    statesHidden: boolean;
    statesLocked: boolean;
    statesCollapsed: boolean;
    objectStates: any[];
    annotationsFilters: string[];
}

interface DispatchToProps {
    updateAnnotations(sessionInstance: any, frameNumber: number, states: any[]): void;
    changeAnnotationsFilters(sessionInstance: any, filters: string[]): void;
    collapseStates(states: any[], value: boolean): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                states: objectStates,
                filters: annotationsFilters,
                collapsed,
            },
            job: {
                instance: jobInstance,
            },
            player: {
                frame: {
                    number: frameNumber,
                },
            },
            tabContentHeight: listHeight,
        },
    } = state;

    let statesHidden = true;
    let statesLocked = true;
    let statesCollapsed = true;

    objectStates.forEach((objectState: any) => {
        const { clientID } = objectState;
        statesHidden = statesHidden && objectState.hidden;
        statesLocked = statesLocked && objectState.lock;
        const stateCollapsed = clientID in collapsed ? collapsed[clientID] : true;
        statesCollapsed = statesCollapsed && stateCollapsed;
    });

    return {
        listHeight,
        statesHidden,
        statesLocked,
        statesCollapsed,
        objectStates,
        frameNumber,
        jobInstance,
        annotationsFilters,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        updateAnnotations(sessionInstance: any, frameNumber: number, states: any[]): void {
            dispatch(updateAnnotationsAsync(sessionInstance, frameNumber, states));
        },
        collapseStates(states: any[], collapsed: boolean): void {
            dispatch(collapseObjectItems(states, collapsed));
        },
        changeAnnotationsFilters(
            sessionInstance: any,
            filters: string[],
        ): void {
            dispatch(changeAnnotationsFiltersAction(filters));
            dispatch(fetchAnnotationsAsync(sessionInstance));
        },
    };
}

function sortAndMap(objectStates: any[], ordering: StatesOrdering): number[] {
    let sorted = [];
    if (ordering === StatesOrdering.ID_ASCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => a.clientID - b.clientID);
    } else if (ordering === StatesOrdering.ID_DESCENT) {
        sorted = [...objectStates].sort((a: any, b: any): number => b.clientID - a.clientID);
    } else {
        sorted = [...objectStates].sort((a: any, b: any): number => b.updated - a.updated);
    }

    return sorted.map((state: any) => state.clientID);
}

type Props = StateToProps & DispatchToProps;

interface State {
    statesOrdering: StatesOrdering;
    objectStates: any[];
    sortedStatesID: number[];
}

class ObjectsListContainer extends React.PureComponent<Props, State> {
    public constructor(props: Props) {
        super(props);
        this.state = {
            statesOrdering: StatesOrdering.ID_ASCENT,
            objectStates: [],
            sortedStatesID: [],
        };
    }

    static getDerivedStateFromProps(props: Props, state: State): State | null {
        if (props.objectStates === state.objectStates) {
            return null;
        }

        return {
            ...state,
            objectStates: props.objectStates,
            sortedStatesID: sortAndMap(props.objectStates, state.statesOrdering),
        };
    }

    private onChangeStatesOrdering = (statesOrdering: StatesOrdering): void => {
        const { objectStates } = this.props;
        this.setState({
            statesOrdering,
            sortedStatesID: sortAndMap(objectStates, statesOrdering),
        });
    };

    private onChangeAnnotationsFilters = (value: SelectValue): void => {
        const {
            jobInstance,
            changeAnnotationsFilters,
        } = this.props;
        const filters = value as string[];
        changeAnnotationsFilters(jobInstance, filters);
    };

    private onLockAllStates = (): void => {
        this.lockAllStates(true);
    };

    private onUnlockAllStates = (): void => {
        this.lockAllStates(false);
    };

    private onCollapseAllStates = (): void => {
        this.collapseAllStates(true);
    };

    private onExpandAllStates = (): void => {
        this.collapseAllStates(false);
    };

    private onHideAllStates = (): void => {
        this.hideAllStates(true);
    };

    private onShowAllStates = (): void => {
        this.hideAllStates(false);
    };

    private lockAllStates(locked: boolean): void {
        const {
            objectStates,
            updateAnnotations,
            jobInstance,
            frameNumber,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.lock = locked;
        }

        updateAnnotations(jobInstance, frameNumber, objectStates);
    }

    private hideAllStates(hidden: boolean): void {
        const {
            objectStates,
            updateAnnotations,
            jobInstance,
            frameNumber,
        } = this.props;
        for (const objectState of objectStates) {
            objectState.hidden = hidden;
        }

        updateAnnotations(jobInstance, frameNumber, objectStates);
    }

    private collapseAllStates(collapsed: boolean): void {
        const {
            objectStates,
            collapseStates,
        } = this.props;

        collapseStates(objectStates, collapsed);
    }

    public render(): JSX.Element {
        const { annotationsFilters, statesHidden, statesLocked } = this.props;
        const {
            sortedStatesID,
            statesOrdering,
        } = this.state;

        const keyMap = {
            SWITCH_ALL_LOCK: {
                name: 'Lock/unlock all objects',
                description: 'Locking objects allows to prevent any updates',
                sequence: 't+l',
                action: 'keydown',
            },
            SWITCH_ALL_HIDDEN: {
                name: 'Hide/show all objects',
                description: 'Hidden objects are invisible on the canvas',
                sequence: 't+h',
                action: 'keydown',
            },
        };

        const handlers = {
            SWITCH_ALL_LOCK: (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }

                this.lockAllStates(!statesLocked);
            },
            SWITCH_ALL_HIDDEN: (event: KeyboardEvent | undefined) => {
                if (event) {
                    event.preventDefault();
                }

                this.hideAllStates(!statesHidden);
            },
        };

        return (
            <GlobalHotKeys keyMap={keyMap as KeyMap} handlers={handlers} allowChanges>
                <ObjectsListComponent
                    {...this.props}
                    statesOrdering={statesOrdering}
                    sortedStatesID={sortedStatesID}
                    annotationsFilters={annotationsFilters}
                    changeStatesOrdering={this.onChangeStatesOrdering}
                    changeAnnotationsFilters={this.onChangeAnnotationsFilters}
                    lockAllStates={this.onLockAllStates}
                    unlockAllStates={this.onUnlockAllStates}
                    collapseAllStates={this.onCollapseAllStates}
                    expandAllStates={this.onExpandAllStates}
                    hideAllStates={this.onHideAllStates}
                    showAllStates={this.onShowAllStates}
                />
            </GlobalHotKeys>
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectsListContainer);
