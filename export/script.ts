/// <reference path='./typings/tsd.d.ts' />

import { MendixSdkClient, OnlineWorkingCopy, Project, Revision, Branch } from "mendixplatformsdk";
import { ModelSdkClient, IModel, projects, domainmodels, microflows, pages, navigation, texts } from "mendixmodelsdk";

import when = require('when');

//const readlineSync = require('readline-sync');

/*
 * CREDENTIALS
 */

const username = "{USERNAME}";
const apikey = "{API KEY}";
const projectId = "{PROJECT ID}";
const projectName = "{PROJECT NAME}";
const revNo = -1; // -1 for latest
const branchName = null // null for mainline

const client = new MendixSdkClient(username, apikey);

/*
 * PROJECT TO ANALYZE
 */
const project = new Project(client, projectId, projectName);

client.platform().createOnlineWorkingCopy(project, new Revision(revNo, new Branch(project, branchName)))
    .then(workingCopy => workingCopy.model().allMicroflows().filter(mf => mf.qualifiedName === 'MyFirstModule.CreateTestCase'))
    .then(microflows => loadAllMicroflows(microflows))
    .then(microflows => microflows.forEach(microflowToText))
    .done(
        () => {
            console.log("Done.");
        },
        error => {
            console.log("Something went wrong:");
            console.dir(error);
        });

function loadAllMicroflows(microflows: microflows.IMicroflow[]): when.Promise<microflows.Microflow[]> {
    return when.all<microflows.Microflow[]>(microflows.map(loadMicroflow));
}

function loadMicroflow(microflow: microflows.IMicroflow): when.Promise<microflows.Microflow> {
    return when.promise<microflows.Microflow>((resolve, reject) => {
        if (microflow) {
            console.log(`Loading microflow: ${microflow.qualifiedName}`);
            microflow.load(mf => {
                if (mf) {
                    console.log(`Loaded microflow: ${microflow.qualifiedName}`);
                    resolve(mf);
                } else {
                    console.log(`Failed to load microflow: ${microflow.qualifiedName}`);
                    reject(`Failed to load microflow: ${microflow.qualifiedName}`);
                }
            });
        } else {
            reject(`'microflow' is undefined`);
        }
    });
}

function getLineRepresentationOfAction(action: microflows.MicroflowAction) {
    if (action instanceof microflows.AggregateListAction) {
        return 'var ' + action.outputVariableName + ' = ' + action.aggregateFunction + ' (' + action.inputListVariableName + '.' + (action.attribute ? action.attribute.name : 'NULL YOLO') + ')';
    } else if (action instanceof microflows.AppServiceCallAction) {
        return "AppServiceCallAction";
    } else if (action instanceof microflows.WebServiceCallAction) {
        return "CallWebServiceAction";
    } else if (action instanceof microflows.CastAction) {
        return 'cast ' + action.outputVariableName;
    } else if (action instanceof microflows.ChangeObjectAction) {
        return action.changeVariableName + '.update(' + action.items.map(x => x.attributeQualifiedName.split('.').splice(2, 1) + '=' + x.value).join(', ') + ')' + (action.refreshInClient ? ' refresh-client' : '') + (action.commit == microflows.CommitEnum.No ? ' no-commit' : (action.commit == microflows.CommitEnum.YesWithoutEvents ? ' commit-no-events' : ''));
    } else if (action instanceof microflows.ChangeListAction) {
        return 'var ' + action.changeVariableName + ' = ' + action.value;
    } else if (action instanceof microflows.ChangeVariableAction) {
        return action.changeVariableName + ' = ' + action.value;
    } else if (action instanceof microflows.CloseFormAction) {
        return 'close_form()';
    } else if (action instanceof microflows.CommitAction) {
        return 'commit ' + action.commitVariableName + (action.withEvents ? '' : ' no-events') + (action.refreshInClient ? ' refresh-client' : '');
    } else if (action instanceof microflows.DeprecatedCreateAction) {
        return 'var ' + action.outputVariableName + ' = new ' + action.entityQualifiedName + '()';
    } else if (action instanceof microflows.CreateObjectAction) {
        return 'var ' + action.outputVariableName + ' = new ' + action.entityQualifiedName + '(' + action.items.map(x => (x.attributeQualifiedName ? x.attributeQualifiedName.split('.')[2] : x.associationQualifiedName) + '=' + x.value).join(', ') + ')';
    } else if (action instanceof microflows.CreateListAction) {
        return 'var ' + action.outputVariableName + ' = List<' + action.entityQualifiedName + '>';
    } else if (action instanceof microflows.CreateVariableAction) {
        return 'var ' + action.variableName + ': ' + action.variableDataType;
    } else if (action instanceof microflows.DeleteAction) {
        return 'delete(' + action.deleteVariableName + ')' + (action.refreshInClient ? ' refresh-client' : '');
    } else if (action instanceof microflows.DownloadFileAction) {
        return 'download-file ' + action.fileDocumentVariableName + (action.showFileInBrowser ? ' show-in-browser' : '');
    } else if (action instanceof microflows.ExportXmlAction) {
        return "ExportXmlAction";
    } else if (action instanceof microflows.GenerateDocumentAction) {
        return "GenerateDocumentAction";
    } else if (action instanceof microflows.ImportXmlAction) {
        return "ImportXmlAction";
    } else if (action instanceof microflows.JavaActionCallAction) {
        return 'var ' + action.outputVariableName + ' = ' + '[JAVA] ' + action.javaActionQualifiedName + '(' + action.parameterMappings.map(x => x.parameterQualifiedName.split('.').splice(2, 1) + '=' + x.argument).join(', ') + ')';
    } else if (action instanceof microflows.ListOperationAction) {
        return "ListOperationAction";
    } else if (action instanceof microflows.LogMessageAction) {
        return "LogMessageAction";
    } else if (action instanceof microflows.MicroflowCallAction) {
        return (action.outputVariableName ? 'var ' + action.outputVariableName + ' = ' : '') + action.microflowCall.microflowQualifiedName + '(' + action.microflowCall.parameterMappings.map(x => x.parameterQualifiedName.split('.').splice(2, 1) + '=' + x.argument).join(', ') + ')';
    } else if (action instanceof microflows.RetrieveAction) {
        var source = action.retrieveSource;
        var bla;
        var range: microflows.Range;
        if (source instanceof microflows.AssociationRetrieveSource) {
            bla = source.startVariableName + '/' + source.associationQualifiedName;
        } else if (source instanceof microflows.DatabaseRetrieveSource) {
            var range = source.range;
            bla = source.entityQualifiedName + source.xPathConstraint;
            if (range instanceof microflows.CustomRange) {
                bla += ' limit = ' + (<microflows.CustomRange>range).limitExpression;
                bla += ' offset = ' + (<microflows.CustomRange>range).offsetExpression;
            } else if (range instanceof microflows.ConstantRange) {
                bla += (<microflows.ConstantRange>range).singleObject ? '.first()' : '';
            }
        }
        return 'var ' + action.outputVariableName + ' = ' + bla;
    } else if (action instanceof microflows.RollbackAction) {
        return "RollbackAction";
    } else if (action instanceof microflows.ShowHomePageAction) {
        return "ShowHomePageAction";
    } else if (action instanceof microflows.ShowMessageAction) {
        return 'show_message(' + action.template + ', blocking=' + (action.blocking ? 'true' : 'false') + ')';
    } else if (action instanceof microflows.ShowPageAction) {
        return 'show_page(' + action.pageSettings.pageQualifiedName + ', title=' + action.pageSettings.formTitle + ')';
    } else if (action instanceof microflows.ValidationFeedbackAction) {
        return "ValidationFeedbackAction";
    } else {
        throw 'not recognized action type: ' + action.typeName;
    }
}

function getLineRepresentation(microflowObject: microflows.MicroflowObject) {
    if (microflowObject instanceof microflows.StartEvent) {
        return null;
    } else if (microflowObject instanceof microflows.ActionActivity) {
        var actionActivity = <microflows.ActionActivity>microflowObject;
        return getLineRepresentationOfAction(actionActivity.action);
    } else if (microflowObject instanceof microflows.Annotation) {
        var annotation = <microflows.Annotation> microflowObject;
        return '#  ' + annotation.caption;
    } else if (microflowObject instanceof microflows.BreakEvent) {
        return "BREAK";
    } else if (microflowObject instanceof microflows.ContinueEvent) {
        return "CONTINUE";
    } else if (microflowObject instanceof microflows.EndEvent) {
        return 'return ' + microflowObject.returnValue;
    } else if (microflowObject instanceof microflows.ErrorEvent) {
        return "raise error";
    } else if (microflowObject instanceof microflows.ExclusiveMerge) {
        return null;
    } else if (microflowObject instanceof microflows.MicroflowParameterObject) {
        if (microflowObject.type[0] == '#')
            return 'param ' + microflowObject.name + ' Enumeration<' + microflowObject.type.substring(1) + '>';
        else
            return 'param ' + microflowObject.name + ': ' + microflowObject.type;
    } else if (microflowObject instanceof microflows.StartEvent) {
        return null;
    } else if (microflowObject instanceof microflows.ExclusiveSplit) {
        throw 'not supposed to be handled here, syntax thing';
    } else if (microflowObject instanceof microflows.InheritanceSplit) {
        throw 'not supposed to be handled here, syntax thing';
    } else if (microflowObject instanceof microflows.LoopedActivity) {
        throw 'not supposed to be handled here, syntax thing';
    } else {
        throw "unknown element: " + microflowObject.typeName;
    }
}


function logIndent(indent: number, message: string) {
    console.log(Array(indent + 1).join(' ') + message);
}


function microflowToText(microflow: microflows.Microflow) {
    console.log('----' + Array(microflow.qualifiedName.length + 1).join('-') + '----');
    console.log('--- ' + microflow.qualifiedName + ' ---');
    console.log('----' + Array(microflow.qualifiedName.length + 1).join('-') + '----');
    console.log('');
    microflow.objectCollection.objects.filter(o => o instanceof microflows.MicroflowParameter).forEach((o) => {
        console.log(getLineRepresentation(o));
    });
    console.log('');

    var startEvent: microflows.StartEvent = microflow.objectCollection.objects.filter(o => o instanceof microflows.StartEvent)[0];

    var annotations: { [originid: string]: microflows.AnnotationFlow[] } = {};
    var flows: { [originid: string]: microflows.SequenceFlow[] } = {};
    var flowsReversed: { [originid: string]: microflows.SequenceFlow[] } = {};

    microflow.flows.forEach(f => {
        if (f instanceof microflows.SequenceFlow) {
            if (!(f.destination.id in flowsReversed))
                flowsReversed[f.destination.id] = [];
            flowsReversed[f.destination.id].push(f);
            if (!(f.origin.id in flows))
                flows[f.origin.id] = [];
            flows[f.origin.id].push(f);
        } else if (f instanceof microflows.AnnotationFlow) {
            if (!(f.destination.id in annotations)) {
                annotations[f.destination.id] = [];
            }
            annotations[f.destination.id].push(f);
            if (!(f.origin.id in annotations)) {
                annotations[f.origin.id] = [];
            }
            annotations[f.origin.id].push(f);
        }
    });

    var visited = {};

    function startWalkingBoots(currentEvent: microflows.MicroflowObject, indent: number, breakOnMerges = true): microflows.ExclusiveMerge[] {
        if (currentEvent instanceof microflows.ExclusiveMerge && breakOnMerges && flowsReversed[currentEvent.id].length > 1) {
            return [currentEvent];
        }
        if (currentEvent.id in visited) {
            console.log('WARNING, BEEN HERE BEFORE ' + currentEvent.typeName);
        }
        visited[currentEvent.id] = true;

        if (currentEvent.id in annotations) {
            annotations[currentEvent.id].forEach((annotation) => {
                if (currentEvent == annotation.destination)
                    logIndent(indent, getLineRepresentation(annotation.origin));
                else
                    logIndent(indent, getLineRepresentation(annotation.destination));
            });
        }

        function displayBlock(currentEvent: microflows.MicroflowObject, indent: number) {
            if (currentEvent instanceof microflows.LoopedActivity) {
                logIndent(indent, 'for (' + currentEvent.loopVariableName + ' in ' + currentEvent.iteratedListVariableName + ') {');
                var loop = (<microflows.LoopedActivity>currentEvent);
                var nextItems = loop.objectCollection.objects.filter(x => !(x.id in flowsReversed || x instanceof microflows.Annotation));

                if (nextItems.length != 1) {
                    throw "Loop in microflow " + microflow.qualifiedName + " has more than one entry point";
                }
                var unfinishedMerges = startWalkingBoots(nextItems[0], indent + 2);
                if (unfinishedMerges.length > 0) {
                    throw 'nested microflow has unfinishedMerges';
                }
                logIndent(indent, '}');
            } else {
                var msg = getLineRepresentation(currentEvent);
                if (msg) {
                    logIndent(indent, msg);
                }
            }
        }


        function resolveUnresolvedMerges(merges: microflows.ExclusiveMerge[], indent) {
            var visits = {};
            var incomingFlowCounts = {};
            var mergeidtomerge = {};
            merges.forEach(merge => {
                if (!(merge.id in visits))
                    visits[merge.id] = 0;
                visits[merge.id] += 1;
                incomingFlowCounts[merge.id] = flowsReversed[merge.id].length;
                mergeidtomerge[merge.id] = merge;
            });
            var remainingUnresolvedFlows = [];
            for (var mergeid in visits) {
                if (visits[mergeid] == incomingFlowCounts[mergeid]) {
                    if (mergeid in flows) {
                        startWalkingBoots(flows[mergeid][0].destination, indent).forEach(x => {
                            remainingUnresolvedFlows.push(x);
                        });
                    }
                } else {
                    for (var i = 0; i < visits[mergeid]; i++) {
                        remainingUnresolvedFlows.push(mergeidtomerge[mergeid]);
                    }
                }
            }
            return remainingUnresolvedFlows;
        }


        if (!(currentEvent.id in flows)) {
            // final destination
            displayBlock(currentEvent, indent);
            return [];
        } else {
            if (flows[currentEvent.id].length == 1) {
                // one-way
                displayBlock(currentEvent, indent);
                var z = startWalkingBoots(flows[currentEvent.id][0].destination, indent);
                return z;
            } else if (flows[currentEvent.id].length == 2 && flows[currentEvent.id].filter(x => x.isErrorHandler).length > 0) {

                // two way try/catch
                logIndent(indent, 'try {');
                displayBlock(currentEvent, indent + 2);
                logIndent(indent, '} catch {');
                var exceptionHandler = flows[currentEvent.id].filter(x => x.isErrorHandler)[0].destination;
                var unfinishedMergesInCatch = startWalkingBoots(exceptionHandler, indent + 2);
                if (unfinishedMergesInCatch.length == 1) {
                    // block has to be duplicated and inlined, need to remove this merge from the next unfinishedMerges block
                    var unfinishedMergesAfterInlining = startWalkingBoots(unfinishedMergesInCatch[0], indent + 2, breakOnMerges = false);
                    if (unfinishedMergesAfterInlining.length > 0) {
                        throw 'unresolved merges remain after inlining, can not handle this';
                    }
                } else if (unfinishedMergesInCatch.length > 1) {
                    throw 'Can not resolve multiple unfinished merges in catch block';
                }
                logIndent(indent, '}');
                var nextFlow = flows[currentEvent.id].filter(x => !x.isErrorHandler)[0].destination;
                var unfinishedMergesAfterTryCatch = startWalkingBoots(nextFlow, indent);
                if (unfinishedMergesAfterTryCatch.length == unfinishedMergesInCatch.length && unfinishedMergesAfterTryCatch.length == 1 && unfinishedMergesInCatch[0] == unfinishedMergesAfterTryCatch[0]) {
                    return startWalkingBoots(unfinishedMergesAfterTryCatch[0], indent, breakOnMerges = false);
                } else {
                    return unfinishedMergesAfterTryCatch;
                }

            } else if (currentEvent instanceof microflows.ExclusiveSplit && flows[currentEvent.id].filter(x => !((<microflows.EnumerationCase>(x.caseValue)).value in { 'true': 1, 'false': 1 })).length > 0) {
                //enumeration split value
                logIndent(indent, 'switch (' + (<microflows.ExpressionSplitCondition>currentEvent.splitCondition).expression + ') {');
                var destinations: { [destinationid: string]: microflows.SequenceFlow[] } = {};
                flows[currentEvent.id].forEach(x => {
                    if (!(x.destination.id in destinations)) {
                        destinations[x.destination.id] = [];
                    }
                    destinations[x.destination.id].push(x);
                });
                var unfinishedMerges: microflows.ExclusiveMerge[] = [];
                for (var x in destinations) {
                    logIndent(indent + 2, '(' + destinations[x].map(l => (<microflows.EnumerationCase>l.caseValue).value).join(' || ') + ') {');
                    startWalkingBoots(destinations[x][0].destination, indent + 4, breakOnMerges = (destinations[x].length != flowsReversed[destinations[x][0].destination.id].length)).forEach(u => {
                        unfinishedMerges.push(u);
                        if (destinations[x][0].destination instanceof microflows.ExclusiveMerge && destinations[x].length != flowsReversed[destinations[x][0].destination.id].length) {
                            for (var i = 1; i < destinations[x].length; i++) {
                                unfinishedMerges.push(u);
                            }
                        }
                    });
                    logIndent(indent + 2, '},');
                };
                logIndent(indent, '}');
                return resolveUnresolvedMerges(unfinishedMerges, indent);
            } else if (currentEvent instanceof microflows.InheritanceSplit) {
                // inheritance split
                logIndent(indent, 'type_of (' + currentEvent.splitVariableName + ') {');
                var destinations: { [destinationid: string]: microflows.SequenceFlow[] } = {};
                flows[currentEvent.id].forEach(x => {
                    if (!(x.destination.id in destinations)) {
                        destinations[x.destination.id] = [];
                    }
                    destinations[x.destination.id].push(x);
                });
                var unfinishedMerges: microflows.ExclusiveMerge[] = [];
                for (var x in destinations) {
                    logIndent(indent + 2, '(' + destinations[x].map(l => (<microflows.InheritanceCase>l.caseValue).valueQualifiedName).join(' | ') + ') {');
                    startWalkingBoots(destinations[x][0].destination, indent + 4, breakOnMerges = (destinations[x].length != flowsReversed[destinations[x][0].destination.id].length)).forEach(u => {
                        unfinishedMerges.push(u);
                        if (destinations[x][0].destination instanceof microflows.ExclusiveMerge && destinations[x].length != flowsReversed[destinations[x][0].destination.id].length) {
                            for (var i = 1; i < destinations[x].length; i++) {
                                unfinishedMerges.push(u);
                            }
                        }
                    });
                    logIndent(indent + 2, '},');
                };
                logIndent(indent, '}');
                return resolveUnresolvedMerges(unfinishedMerges, indent);
            } else if (currentEvent instanceof microflows.ExclusiveSplit && flows[currentEvent.id].filter(x => !((<microflows.EnumerationCase>(x.caseValue)).value in { 'true': 1, 'false': 1 })).length == 0) {
                // true/false split
                var trueHandler = flows[currentEvent.id].filter(x => (<microflows.EnumerationCase>x.caseValue).value == 'true')[0];
                var falseHandler = flows[currentEvent.id].filter(x => (<microflows.EnumerationCase>x.caseValue).value == 'false')[0];
                var unfinishedMerges: microflows.ExclusiveMerge[] = [];
                var conditionCaption = '';
                var condition = currentEvent.splitCondition;

                if (condition instanceof microflows.ExpressionSplitCondition) {
                    conditionCaption = (<microflows.ExpressionSplitCondition>condition).expression;
                } else if (condition instanceof microflows.RuleSplitCondition) {
                    var c = <microflows.RuleSplitCondition>condition;
                    conditionCaption = c.ruleCall.ruleQualifiedName + '(' + c.ruleCall.parameterMappings.map(x => x.parameterQualifiedName.split('.').splice(2, 1) + '=' + x.argument).join(', ') + ')';
                }
                logIndent(indent, 'if (' + conditionCaption + ') {');
                startWalkingBoots(trueHandler.destination, indent + 2).forEach(u => {
                    unfinishedMerges.push(u);
                });
                logIndent(indent, '} else {');
                startWalkingBoots(falseHandler.destination, indent + 2).forEach(u => {
                    unfinishedMerges.push(u);
                });
                logIndent(indent, '}');
                var result = resolveUnresolvedMerges(unfinishedMerges, indent);
                return result;

            }
        }
        throw 'woah, you think you can exit without returning a list of unfinished merges?';
    }
    try {
        var unfinishedMerges = startWalkingBoots(startEvent, 0);
        if (unfinishedMerges.length > 0) {
            console.log('unfinished merges!!');
        }
    } catch (e) {
        console.log('unfinished merges!! ' + e);
    }

    console.log('');
    console.log('');
}
