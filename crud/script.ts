///<reference path="typings/tsd.d.ts" />

import { MendixSdkClient, Project, OnlineWorkingCopy, Revision } from "mendixplatformsdk";
import { ModelSdkClient, IModel, projects, domainmodels, microflows, pages, navigation, texts, menus, security } from "mendixmodelsdk";

import {associate, createEntity, addAutoNumberAttribute, addDateTimeAttribute, addIntegerAttribute, addStringAttribute} from "mendixmodelcomponents";
import {retrieveLayout, createEditPageForEntity, createListPageForEntity, createText} from "mendixmodelcomponents";
import {createMicroflow, createParameter, createStartEvent, createEndEvent, createRetrieveByAssociationActivity, addObjectToMicroflow} from "mendixmodelcomponents";

import when = require('when');

const readlineSync = require('readline-sync');

/*
 * CREDENTIALS
 */
const username = "{USERNAME}";
const apikey = "{API KEY}";

const appname = "GeneratedApp-" + Date.now();

/*
 *
 * Existing content
 *
 */

const desktopLayoutName = 'NavigationLayouts.Sidebar_Full_Responsive'
const desktopLayoutPlaceholderName = 'Content';

/*
 *
 * New content
 *
 */

const myFirstModuleName = 'MyFirstModule';

const customerEntityName = 'Customer';
const customerNumberAttributeName = 'Number';
const invoiceEntityName = 'Invoice';
const invoiceNumberAttributeName = 'Number';
const invoiceTimestampAttributeName = 'Timestamp';
const invoiceLineEntityName = 'InvoiceLine';
const invoiceLineProductAttributeName = 'Product';

const client = new MendixSdkClient(username, apikey);

client.platform()
	.createNewApp(appname)
	.then(project => {
		myLog(`Created new project: ${project.id() }: ${project.name() }`);
		readlineSync.question("About to create online working copy. Press [ENTER] to continue ... ");

		return project.createWorkingCopy();
	})
	.then(workingCopy => {
		myLog(`Created working copy: ${workingCopy.id() }`);
		readlineSync.question("About to generate a domain model. Press [ENTER] to continue ... ");

		return generateApp(workingCopy);
	})
	.then(workingCopy => {
		readlineSync.question("About to commit changes back to the Team Server. Press [ENTER] to continue ... ");
		return workingCopy.commit();
	})
	.done(
	() => {
		myLog("Done. Check the result in the Mendix Business Modeler.");
	},
	error => {
		console.log("Something went wrong:");
		console.dir(error);
	});

function generateApp(workingCopy: OnlineWorkingCopy): when.Promise<OnlineWorkingCopy> {
	console.log("Generating app model...");

	const module = workingCopy.model()
		.allModules()
		.filter(m => m.name === myFirstModuleName)[0];

	return createDomainModel(module)
		.then(module => createPages(workingCopy.model(), module))
		.then(module => createMicroflows(module))
		.then(module => updateNavigation(workingCopy.model(), module))
		.then(module => updateSecurity(workingCopy.model(),module))
		.then(module => updateEntitySecurity(workingCopy.model(),module))
		.then(module =>updatePageSecurity(workingCopy.model(),module))
		.then(_ => console.log(`Generated app model successfully.`))
		.then(_ => workingCopy);
}

/*
 *
 * UTILITIES
 *
 */

function myLog(message, ...optionalParams: any[]): void {
	console.log(`${Date.now() }: ${message} ${optionalParams}`);
}

interface Loadable<T> {
	load(callback: (result: T) => void): void;
}

function loadAsPromise<T>(loadable: Loadable<T>): When.Promise<T> {
	return when.promise<T>((resolve, reject) => loadable.load(resolve));
}

/*
 *
 * DOMAIN MODEL
 *
 */

function createDomainModel(module: projects.IModule): when.Promise<projects.IModule> {
	myLog('Creating domain model ...');

	return loadAsPromise(module.domainModel)
		.then(domainModel => {
			let customer = createEntity(domainModel, customerEntityName, 100, 100);
			addAutoNumberAttribute(customer, customerNumberAttributeName, '1');
			addStringAttribute(customer, 'FirstName');
			addDateTimeAttribute(customer, 'SignupDate');
			addStringAttribute(customer, 'LastName');
			addStringAttribute(customer, 'Email');
			addStringAttribute(customer, 'Address');

			let invoice = createEntity(domainModel, invoiceEntityName, 400, 100);
			addAutoNumberAttribute(invoice, invoiceNumberAttributeName, '1');
			addDateTimeAttribute(invoice, invoiceTimestampAttributeName);

			let invoiceLine = createEntity(domainModel, invoiceLineEntityName, 700, 100);
			addStringAttribute(invoiceLine, invoiceLineProductAttributeName);
			addIntegerAttribute(invoiceLine, 'Quantity');

			associate(domainModel, invoice, customer, 'Invoices');
			associate(domainModel, invoiceLine, invoice, 'Lines');

			myLog('Created domain model.');

			return module;
		});
}

/*
 *
 * PAGES
 *
 */

function createPages(project: IModel, module: projects.IModule): when.Promise<projects.IModule> {
	myLog('Creating new pages ...');

	return retrieveLayout(project, desktopLayoutName)
		.then(desktopLayout => {
			return loadAsPromise(module.domainModel)
				.then(domainModel => {
					let entities = domainModel.entities
						.filter(e => e.name === customerEntityName
							|| e.name === invoiceEntityName
							|| e.name === invoiceLineEntityName);

					entities.forEach(entity => {
						let editPage = createEditPageForEntity(entity, desktopLayout, desktopLayoutPlaceholderName);
						createListPageForEntity(entity, sortAttributeForEntity(entity), desktopLayout, desktopLayoutPlaceholderName, editPage);
					});

					myLog('New pages created.');

					return module;
				});
		});
}

function sortAttributeForEntity(entity: domainmodels.Entity): domainmodels.Attribute {
	// Yolo
	
	if (entity.qualifiedName === myFirstModuleName + '.' + customerEntityName) {
		let attributes = entity.attributes.filter(a => a.name === customerNumberAttributeName);

		if (attributes.length >= 1) {
			return attributes[0];
		} else {
			return null;
		}
	} else if (entity.qualifiedName === myFirstModuleName + '.' + invoiceEntityName) {
		let attributes = entity.attributes.filter(a => a.name === invoiceTimestampAttributeName);

		if (attributes.length >= 1) {
			return attributes[0];
		} else {
			return null;
		}
	} else if (entity.qualifiedName === myFirstModuleName + '.' + invoiceLineEntityName) {
		let attributes = entity.attributes.filter(a => a.name === invoiceLineProductAttributeName);

		if (attributes.length >= 1) {
			return attributes[0];
		} else {
			return null;
		}
	}
}

/*
 *
 * NAVIGATION
 *
 */

function updateNavigation(project: IModel, module: projects.IModule): when.Promise<projects.IModule> {
		const targetPage: pages.Page = null;

			return loadAsPromise(project.allNavigationDocuments()[0])
				.then(navdoc => {
                       
                    var navigationProfile = navdoc.desktopProfile;
                    
					let pagesList = project.allPages().filter(a => a.name.indexOf('List') >= 0);
					var menuItemCollection = navigationProfile.menuItemCollection;
					pagesList.forEach(page => {
						var  pageName = page.name.replace(/_/g, ' ');
						console.log('Adding page ' + pageName+ ' to navigation');
						
						var pageSetting = new pages.PageSettings();
        				pageSetting.page = page;		
						
						var pageClientAction = new pages.PageClientAction();
        				pageClientAction.pageSettings = pageSetting;
						
						 var menuItem = new menus.MenuItem();
        				menuItem.caption = createText(pageName); 
						menuItem.action = pageClientAction;
						 if(page.name === 'Customer_List'){
                             navigationProfile.homePage = new navigation.HomePage();
                            navigationProfile.homePage.page = page;
                         }
						
						menuItemCollection.items.push(menuItem);
				
                        
					});
					navigationProfile.enabled = true;
					navigationProfile.applicationTitle = "Mendix";
					navigationProfile.menuItemCollection = menuItemCollection;                    

					return module;
				});
}

/*
 *
 * MICROFLOWS
 *
 */

let newMicroflowName = 'MyFirstNewMicroflow';

function createMicroflows(module: projects.IModule): projects.IModule {
	myLog('Creating microflow ...');

	// 	let startEvent = new microflows.StartEvent();
	// 	startEvent.relativeMiddlePoint = { x: 0, y: 0 };
	// 
	// 	let retrieveAction = new microflows.RetrieveAction();
	// 	let retrieveActionActivity = new microflows.ActionActivity();
	// 	retrieveActionActivity.action = retrieveAction;
	// 	retrieveActionActivity.relativeMiddlePoint = { x: 100, y: 0 };
	// 
	// 	let endEvent = new microflows.EndEvent();
	// 	endEvent.relativeMiddlePoint = { x: 200, y: 0 };
	// 
	// 	let microflow = new microflows.Microflow(module);
	// 	microflow.name = newMicroflowName;
	// 
	// 	microflow.objectCollection = new microflows.MicroflowObjectCollection();
	// 	microflow.objectCollection.objects.push(startEvent);
	// 	microflow.objectCollection.objects.push(retrieveActionActivity);
	// 	microflow.objectCollection.objects.push(endEvent);
	// 
	// 	let sequence1 = new microflows.SequenceFlow();
	// 	sequence1.origin = startEvent;
	// 	sequence1.destination = retrieveActionActivity;
	// 
	// 	let sequence2 = new microflows.SequenceFlow();
	// 	sequence2.origin = retrieveActionActivity;
	// 	sequence2.destination = endEvent;
	// 
	// 	microflow.flows.push(sequence1);
	// 	microflow.flows.push(sequence2);

	createExampleMicroflow(module);

	myLog('Microflow created.');

	return module;
}

function createExampleMicroflow(module: projects.IModule) {
	let customer = module.domainModel.entities.filter(e => e.name === customerEntityName)[0];
	let invoice = module.domainModel.entities.filter(e => e.name === invoiceEntityName)[0];

	let microflow = createMicroflow(module, newMicroflowName);

	let parameterName = customerEntityName + 'Input';

	let parameter = createParameter(parameterName, customer.qualifiedName);
	addObjectToMicroflow(microflow, microflow.objectCollection, parameter, null);

	let previousObject = addObjectToMicroflow(microflow, microflow.objectCollection, createStartEvent(), null);

	let invoicesAssoc = module.domainModel.associations.filter(a => a.name === 'Invoices')[0];
	let retrieveByAssocActivity = createRetrieveByAssociationActivity(parameter.name, invoicesAssoc);
	previousObject = addObjectToMicroflow(microflow, microflow.objectCollection, retrieveByAssocActivity, previousObject);

	let endEvent = createEndEvent(microflow, "[" + invoice.qualifiedName + "]",
		"$" + (<microflows.RetrieveAction>retrieveByAssocActivity.action).outputVariableName);
	previousObject = addObjectToMicroflow(microflow, microflow.objectCollection, endEvent, previousObject, false);
}

/*
*
* Security
*
*/
function updateSecurity(project: IModel, module: projects.IModule): when.Promise<projects.IModule> {
	console.log('Turning security on to production');
	return loadAsPromise(project.allProjectSecurities()[0])
		.then(projectSecurity => {
			projectSecurity.securityLevel = new security.SecurityLevel("CheckEverything");
			projectSecurity.adminPassword = '1';
			return module;
		});
	
}

function updateEntitySecurity(project: IModel, module: projects.IModule): when.Promise<projects.IModule> {
	console.log('creating access rules');
	return loadAsPromise(module.moduleSecurity)
		.then(moduleSecurity => {
			var moduleRole =moduleSecurity.moduleRoles.filter(a => a.name === 'User')[0];
			
			return loadAsPromise(module.domainModel)
		.then(domainModel => { 
			var entitiesList = domainModel.entities;
			
			entitiesList.forEach(entity => {
				console.log('creating access rule for'+ entity.name);
				var accessRule = new domainmodels.AccessRule();
				accessRule.moduleRoles.push(moduleRole);
				accessRule.allowCreate = true;
				accessRule.allowDelete = true;
				var defaultMemberAccessRights = new domainmodels.MemberAccessRights("ReadWrite");
				
				accessRule.defaultMemberAccessRights = defaultMemberAccessRights;
				entity.accessRules.push(accessRule);
				
			});
			return module;
			});
		});
	}
			
		
			
function updatePageSecurity(project: IModel, module: projects.IModule): when.Promise<projects.IModule> {
	console.log('creating access rules for pages');
	return loadAsPromise(module.moduleSecurity)
		.then(moduleSecurity => {
			var moduleRole =moduleSecurity.moduleRoles.filter(a => a.name === 'User')[0];
			
				let pagesList = project.allPages().filter(a => a.qualifiedName.indexOf(myFirstModuleName) >= 0);
					pagesList.forEach(page => {
						return loadAsPromise(page)
						.then(pageObj =>{
							console.log('creating page access for'+ pageObj.name);
							pageObj.allowedRoles.push(moduleRole);
							return module;
						});
				
					});
			return module;
			});
}