/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript

 * Author:               Ankith Ravindran
 * Created on:           Wed Sep 17 2025
 * Modified on:          Wed Sep 17 2025 11:11:49
 * SuiteScript Version:  2.0
 * Description:          Schedule Script to create App jobs for LPO Connect and LocalMile Customers linked with LPO.  
 *
 * Copyright (c) 2025 MailPlus Pty. Ltd.
 */


define(["SuiteScripts/jQuery Plugins/Moment JS/moment.min",
    "N/task",
    "N/email",
    "N/runtime",
    "N/search",
    "N/record",
    "N/format",
    "N/https",
], function (moment, task, email, runtime, search, record, format, https) {
    var apiHeaders = {};
    apiHeaders["Content-Type"] = "application/json";
    apiHeaders["Accept"] = "application/json";
    apiHeaders["GENERAL-API-KEY"] = "708aa067-d67d-73e6-8967-66786247f5d7";

    var baseURL = "https://1048144.app.netsuite.com";
    if (runtime.EnvType == "SANDBOX") {
        baseURL = "https://1048144-sb3.app.netsuite.com";
    }

    var tomorrowDateYYYYMMDD = null;
    var activeOperator = [];

    log.debug({
        title: "todays date",
        details: moment.utc(),
    });

    var day = moment.utc().day(); //Get the day of the week
    var date = moment.utc().add(1, "days").date(); //Get tomorrows date
    var month = moment.utc().month(); //Get current month
    var year = moment.utc().year(); //Get current Year

    log.debug({
        title: "day",
        details: day,
    });
    log.debug({
        title: "date",
        details: date,
    });
    log.debug({
        title: "month",
        details: month,
    });
    log.debug({
        title: "year",
        details: year,
    });

    var startDate = moment([year, month]); //Get Start Date of the current Month
    var endDate = moment(startDate).endOf("month").date(); //Get the end date of the current month

    //Calculate the App Job Date based on todays date. If todays date is the last day of the month, next move to first of next month else set as tomorrows date.
    var setMonth;
    if (moment.utc().date() == endDate) {
        date_of_week = date + "/" + (month + 2) + "/" + year;
        setMonth = month + 2;
    } else {
        date_of_week = date + "/" + (month + 1) + "/" + year;
        setMonth = month + 1;
    }

    log.debug({
        title: "date_of_week",
        details: date_of_week,
    });

    var netsuiteDateFormat = dateSelected2Date(
        year + "-" + setMonth + "-" + date
    );

    log.debug({
        title: "netsuiteDateFormat",
        details: netsuiteDateFormat,
    });

    var new_day = 0;
    new_day = day + 1;

    log.debug({
        title: "new_day",
        details: new_day,
    });

    //Use the correct search based on the day of the week.
    switch (new_day) {
        case 1:
            var serviceStopSearch = search.load({
                id: "customsearch_ser_stops_create_job_mon_2",
                type: "customrecord_service_stop",
            });
            break;
        case 2:
            var serviceStopSearch = search.load({
                id: "customsearch_ser_stops_create_job_tue_2",
                type: "customrecord_service_stop",
            });
            break;
        case 3:
            var serviceStopSearch = search.load({
                id: "customsearch_ser_stops_create_job_wed_2",
                type: "customrecord_service_stop",
            });
            break;
        case 4:
            var serviceStopSearch = search.load({
                id: "customsearch_ser_stops_create_job_thu_2",
                type: "customrecord_service_stop",
            });
            break;
        case 5:
            var serviceStopSearch = search.load({
                id: "customsearch_ser_stops_create_job_fri_2",
                type: "customrecord_service_stop",
            });
            break;
    }


    function execute(context) {
        var old_service_id;
        var app_job_group_id2;
        var app_job_group_name;

        // tomorrowDateYYYYMMDD = getTomorrowsDate();
        // var dateDDMMYYYY = convertDateToDDMMYYYY(lpoServiceDate);

        var count = 0;
        var exit = false;
        serviceStopSearch.run().each(function (result) {
            var appServiceStopInternalId = result.getValue({
                name: "internalid",
            });
            var appServiceStopStopName = result.getValue({
                name: "custrecord_1288_stop_name",
            });
            var appServiceStopStopTimes = result.getValue({
                name: "custrecord_1288_stop_times",
            });
            var appServiceStopCustomer = result.getValue({
                name: "custrecord_1288_customer",
            });
            var appServiceStopCustomerText = result.getText({
                name: "custrecord_1288_customer",
            });
            var appServiceStopFranchisee = result.getValue({
                name: "custrecord_1288_franchisee",
            });
            var appServiceStopFranchiseeLocation = result.getValue({
                name: "location",
                join: "CUSTRECORD_1288_FRANCHISEE",
            });
            var appServiceStopService = result.getValue({
                name: "custrecord_1288_service",
            });
            var appServiceStopServiceText = result.getText({
                name: "custrecord_1288_service",
            });
            // var appServiceStopOperator = result.getValue({
            //     name: "custrecord_1288_operator",
            // });
            // var appServiceStopRunPlan = result.getValue({
            //     name: "custrecord_1288_plan",
            // });
            var appServiceStopAddressType = result.getValue({
                name: "custrecord_1288_address_type",
            });
            var appServiceStopFreq = result.getValue({
                name: "custrecord_1288_frequency",
            });
            var appServiceStopNotes = result.getValue({
                name: "custrecord_1288_notes",
            });
            var appServiceAddressBook = result.getValue({
                name: "custrecord_1288_address_book",
            });
            var appServicePostalLocation = result.getValue({
                name: "custrecord_1288_postal_location",
            });
            var appServiceSequence = result.getValue({
                name: "custrecord_1288_sequence",
            });
            var lpoParentCustomerInternalId = result.getValue({
                name: "custentity_lpo_parent_account",
                join: "CUSTRECORD_1288_CUSTOMER",
            });

            // NetSuite Search:Australia Public Holidays - For Tomorrow
            var australiaPublicHolidayTomorrowSearch = search.load({
                id: "customsearch_public_holiday_tomorrow",
                type: "customrecord_aus_public_holidays_dates",
            });

            australiaPublicHolidayTomorrowSearch.filters.push(
                search.createFilter({
                    name: "custrecord_public_holidays_state",
                    join: "CUSTRECORD_AUS_PUBLIC_HOLIDAY_RECORD",
                    operator: search.Operator.ANYOF,
                    values: appServiceStopFranchiseeLocation,
                })
            );

            var todayIsPublicHolidayCount =
                australiaPublicHolidayTomorrowSearch.runPaged().count;

            log.debug({
                title: "todayIsPublicHolidayCount",
                details: todayIsPublicHolidayCount,
            });

            if (todayIsPublicHolidayCount == 0) {

                var service_leg_addr_add1 = null;
                var service_leg_addr_st_num = null;
                var service_leg_addr_suburb = null;
                var service_leg_addr_state = null;
                var service_leg_addr_postcode = null;
                var service_leg_addr_lat = null;
                var service_leg_addr_lon = null;
                var stopNameForPickup = '';

                // Get the Linked Franchisees from the LPO Parent Record
                var lpoParentRecord = record.load({
                    type: 'customer',
                    id: lpoParentCustomerInternalId
                })
                var lpoName = lpoParentRecord.getValue({
                    fieldId: 'companyname'
                });
                var lpoLinkedZees = lpoParentRecord.getValue({
                    fieldId: 'custentity_lpo_linked_franchisees'
                });
                var lpoNameArray = lpoName.split(' - ');
                lpoName = lpoNameArray[0].trim();

                if (!isNullorEmpty(lpoLinkedZees)) {
                    lpoLinkedZees = lpoLinkedZees.toString();
                    log.debug({
                        title: 'lpoLinkedZees',
                        details: lpoLinkedZees
                    })
                    if (lpoLinkedZees.indexOf(",") != -1) {
                        var lpoLinkedZeesArray = lpoLinkedZees.split(",");
                    } else {
                        var lpoLinkedZeesArray = [];
                        lpoLinkedZeesArray.push(lpoLinkedZees);
                    }
                }
                log.debug({
                    title: 'lpoLinkedZeesArray',
                    details: lpoLinkedZeesArray
                })

                //Get active operators based on the AP suburb mapping from the linked franchisees to the LPO Parent Record
                for (var x = 0; x < lpoLinkedZeesArray.length; x++) {
                    var partnerRecord = record.load({
                        type: record.Type.PARTNER,
                        id: lpoLinkedZeesArray[x],
                    });

                    var zeeJSONString = partnerRecord.getValue({
                        fieldId: "custentity_ap_suburbs_json",
                    })

                    var zeeJSON = JSON.parse(zeeJSONString);
                    zeeJSON.forEach(function (suburb) {
                        if (!isNullorEmpty(suburb.primary_op)) {
                            for (var i = 0; i < suburb.primary_op.length; i++) {
                                activeOperator.push(suburb.primary_op[i]);
                            }
                        }
                    });
                }

                if (!isNullorEmpty(appServiceAddressBook)) {
                    //Load the lead record
                    var customerRecord = record.load({
                        type: record.Type.CUSTOMER,
                        id: appServiceStopCustomer,
                        isDynamic: true,
                    });

                    var lineIndex = customerRecord.findSublistLineWithValue({
                        sublistId: "addressbook",
                        fieldId: "internalid",
                        value: appServiceAddressBook,
                    });

                    if (lineIndex > -1) {
                        customerRecord.selectLine({
                            sublistId: "addressbook",
                            line: lineIndex,
                        });

                        var addressSubrecord = customerRecord.getCurrentSublistSubrecord({
                            sublistId: "addressbook",
                            fieldId: "addressbookaddress",
                        });

                        service_leg_addr_add1 = addressSubrecord.getValue({
                            fieldId: "addr1",
                        });
                        service_leg_addr_st_num = addressSubrecord.getValue({
                            fieldId: "addr2",
                        });
                        service_leg_addr_suburb = addressSubrecord.getValue({
                            fieldId: "city",
                        });
                        service_leg_addr_state = addressSubrecord.getValue({
                            fieldId: "state",
                        });
                        service_leg_addr_postcode = addressSubrecord.getValue({
                            fieldId: "zip",
                        });
                        service_leg_addr_lat = addressSubrecord.getValue({
                            fieldId: "custrecord_address_lat",
                        });
                        service_leg_addr_lon = addressSubrecord.getValue({
                            fieldId: "custrecord_address_lon",
                        });
                    }
                }

                if (!isNullorEmpty(appServicePostalLocation)) {
                    var nclRecord = record.load({
                        type: "customrecord_ap_lodgment_location",
                        id: appServicePostalLocation,
                    });

                    service_leg_addr_add1 = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_addr1",
                    });
                    service_leg_addr_st_num = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_addr2",
                    });
                    service_leg_addr_suburb = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_suburb",
                    });
                    service_leg_addr_state = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_site_state",
                    });
                    service_leg_addr_postcode = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_postcode",
                    });
                    service_leg_addr_lat = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_lat",
                    });
                    service_leg_addr_lon = nclRecord.getValue({
                        fieldId: "custrecord_ap_lodgement_long",
                    });
                }

                log.audit({
                    title: "Main Loop App Job Group Id",
                });
                log.audit({
                    title: "app_job_group_id2",
                    details: app_job_group_id2,
                });

                if (isNullorEmpty(old_service_id)) {


                    //Create App Job Group
                    app_job_group_id2 = createAppJobGroup(
                        appServiceStopServiceText,
                        appServiceStopCustomer,
                        appServiceStopFranchisee,
                        appServiceStopService
                    );

                    //Create App Jobs
                    var app_job_id = createAppJobs(
                        appServiceStopCustomer,
                        appServiceStopStopName,
                        appServiceStopService,
                        appServiceStopStopTimes,
                        app_job_group_id2,
                        service_leg_addr_st_num,
                        service_leg_addr_suburb,
                        service_leg_addr_state,
                        service_leg_addr_postcode,
                        service_leg_addr_lat,
                        service_leg_addr_lon,
                        appServiceStopFranchisee,
                        appServiceStopNotes,
                        null,
                        appServiceStopAddressType,
                        appServiceStopFreq,
                        appServiceStopCustomerText,
                        app_job_group_name, appServiceSequence
                    );

                    log.audit({
                        title: "Inside Null Old Service Id",
                    });
                    log.audit({
                        title: "app_job_group_id2",
                        details: app_job_group_id2,
                    });
                } else if (old_service_id == appServiceStopService) {
                    log.audit({
                        title:
                            "Inside Mathcing Old Service Id with App Service Stop Service ID",
                    });
                    log.audit({
                        title: "app_job_group_id2",
                        details: app_job_group_id2,
                    });

                    //Create App Jobs
                    var app_job_id = createAppJobs(
                        appServiceStopCustomer,
                        appServiceStopStopName,
                        appServiceStopService,
                        appServiceStopStopTimes,
                        app_job_group_id2,
                        service_leg_addr_st_num,
                        service_leg_addr_suburb,
                        service_leg_addr_state,
                        service_leg_addr_postcode,
                        service_leg_addr_lat,
                        service_leg_addr_lon,
                        appServiceStopFranchisee,
                        appServiceStopNotes,
                        null,
                        appServiceStopAddressType,
                        appServiceStopFreq,
                        appServiceStopCustomerText,
                        app_job_group_name, appServiceSequence
                    );
                } else if (old_service_id != appServiceStopService) {
                    reschedule = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: "customscript_ss2_create_scheduled_jobs",
                        deploymentId: "customdeploy2",
                        params: null,
                    });

                    log.audit({
                        title: "Reschedule Return - IN LOOP",
                    });
                    var rescheduled = reschedule.submit();

                    log.audit({
                        title: "rescheduled",
                        value: rescheduled,
                    });

                    return false;
                }

                log.audit({
                    title: "Updating the App Service Stop",
                });
                log.audit({
                    title: "appServiceStopInternalId",
                    details: appServiceStopInternalId,
                });

                //Mark "App Job Created" in the App Service Stop as true
                var serviceStopRecord = record.load({
                    type: "customrecord_service_stop",
                    id: appServiceStopInternalId,
                });

                serviceStopRecord.setValue({
                    fieldId: "custrecord_1288_app_job_created",
                    value: true,
                });

                serviceStopRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true,
                });
            }

            if (exit == false) {
                old_service_id = appServiceStopService;
                count++;
                return true;
            }
        });
    }

    /**
 * @description Gets yesterday's date in "YYYY-MM-DD" format.
 * @returns {String} Yesterday's date in "YYYY-MM-DD" format.
 */
    function getTomorrowsDate() {
        var today = new Date();
        today.setHours(today.getHours() + 10);
        // var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        log.audit({
            title: 'today',
            details: today
        })
        log.audit({
            title: 'today.getDate()',
            details: today.getDate()
        })

        var year = today.getFullYear();
        var month = customPadStart((today.getMonth() + 1).toString(), 2, "0"); // Months are zero-based
        var day = customPadStart((today.getDate() + 1), 2, "0");

        return year + "-" + month + "-" + day;
    }


    function convertDateToDDMMYYYYDash(dateStr) {
        // Expects dateStr in "YYYY-MM-DD"
        var parts = dateStr.split("-");
        return parts[2] + "-" + parts[1] + "-" + parts[0];
    }

    /**
     * @description
     * @author Ankith Ravindran (AR)
     * @date 01/05/2024
     * @param {*} service_leg_service_text
     * @param {*} service_leg_customer
     * @param {*} service_leg_zee
     * @param {*} service_id
     * @returns {*}
     */
    function createAppJobGroup(
        service_leg_service_text,
        service_leg_customer,
        service_leg_zee,
        service_id
    ) {
        var app_job_group_rec = record.create({
            type: "customrecord_jobgroup",
        });
        app_job_group_rec.setValue({
            fieldId: "name",
            value: 'LPO-' + service_leg_service_text + "_" + date_of_week,
        });
        app_job_group_name = service_leg_service_text + "_" + date_of_week;
        app_job_group_rec.setValue({
            fieldId: "custrecord_jobgroup_ref",
            value: 'LPO-' + service_leg_service_text + "_" + date_of_week,
        });
        app_job_group_rec.setValue({
            fieldId: "custrecord_jobgroup_customer",
            value: service_leg_customer,
        });
        app_job_group_rec.setValue({
            fieldId: "custrecord_jobgroup_franchisee",
            value: service_leg_zee,
        });
        app_job_group_rec.setValue({
            fieldId: "custrecord_jobgroup_service",
            value: service_id,
        });
        app_job_group_rec.setValue({
            fieldId: "custrecord_jobgroup_status",
            value: 4,
        });
        var app_job_group_id = app_job_group_rec.save();

        return app_job_group_id;
    }

    /**
     * @description
     * @author Ankith Ravindran (AR)
     * @date 02/05/2024
     * @param {*} appServiceStopCustomer
     * @param {*} appServiceStopStopName
     * @param {*} appServiceStopService
     * @param {*} appServiceStopStopTimes
     * @param {*} app_job_group_id2
     * @param {*} service_leg_addr_st_num
     * @param {*} service_leg_addr_suburb
     * @param {*} service_leg_addr_state
     * @param {*} service_leg_addr_postcode
     * @param {*} service_leg_addr_lat
     * @param {*} service_leg_addr_lon
     * @param {*} appServiceStopFranchisee
     * @param {*} appServiceStopNotes
     * @param {*} appServiceStopRunPlan
     * @param {*} appServiceStopAddressType
     * @param {*} appServiceStopFreq
     * @param {*} appServiceStopCustomerText
     */
    function createAppJobs(
        appServiceStopCustomer,
        appServiceStopStopName,
        appServiceStopService,
        appServiceStopStopTimes,
        app_job_group_id2,
        service_leg_addr_st_num,
        service_leg_addr_suburb,
        service_leg_addr_state,
        service_leg_addr_postcode,
        service_leg_addr_lat,
        service_leg_addr_lon,
        appServiceStopFranchisee,
        appServiceStopNotes,
        appServiceStopRunPlan,
        appServiceStopAddressType,
        appServiceStopFreq,
        appServiceStopCustomerText,
        app_job_group_name, appServiceSequence
    ) {
        var app_job_rec = record.create({
            type: "customrecord_job",
        });
        app_job_rec.setValue({
            fieldId: "custrecord_job_franchisee",
            value: appServiceStopFranchisee,
        });

        var frequencyArray = appServiceStopFreq.split(",");
        var app_job_stop_name = "";

        //1,1,1,1,1,0
        if (frequencyArray[5] == 1 || frequencyArray[5] == "1") {
            if (appServiceStopAddressType == 3) {
                app_job_rec.setValue({
                    fieldId: "custrecord_app_job_stop_name",
                    value:
                        "ADHOC - " +
                        appServiceStopStopName +
                        " - " +
                        appServiceStopCustomerText,
                });
                app_job_stop_name =
                    "ADHOC - " +
                    appServiceStopStopName +
                    " - " +
                    appServiceStopCustomerText;
            } else {
                app_job_rec.setValue({
                    fieldId: "custrecord_app_job_stop_name",
                    value: "ADHOC - " + appServiceStopStopName,
                });
                app_job_stop_name = "ADHOC - " + appServiceStopStopName;
            }
        } else {
            app_job_rec.setValue({
                fieldId: "custrecord_app_job_stop_name",
                value: appServiceStopStopName,
            });
            app_job_stop_name = appServiceStopStopName;
        }

        app_job_rec.setValue({
            fieldId: "custrecord_job_customer",
            value: appServiceStopCustomer,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_job_source",
            value: 6,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_job_service",
            value: appServiceStopService,
        });

        //Get the service price from the service record
        var serviceRecord = record.load({
            type: "customrecord_service",
            id: appServiceStopService,
        });

        var servicePrice = serviceRecord.getValue({
            fieldId: "custrecord_service_price",
        });

        app_job_rec.setValue({
            fieldId: "custrecord_job_service_price",
            value: servicePrice,
        });

        app_job_rec.setValue({
            fieldId: "custrecord_job_group",
            value: app_job_group_id2,
        });

        app_job_rec.setValue({
            fieldId: "custrecord_app_job_st_name_no",
            value: service_leg_addr_st_num,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_app_job_suburb",
            value: service_leg_addr_suburb,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_app_job_state",
            value: service_leg_addr_state,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_app_job_post_code",
            value: service_leg_addr_postcode,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_app_job_lat",
            value: service_leg_addr_lat,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_app_job_lon",
            value: service_leg_addr_lon,
        });

        app_job_rec.setValue({
            fieldId: "custrecord_app_job_notes",
            value: appServiceStopNotes,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_app_job_run",
            value: appServiceStopRunPlan,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_job_service_leg",
            value: appServiceSequence,
        });

        var app_job_location_type_name = "";
        if (appServiceStopAddressType == 3) {
            app_job_rec.setValue({
                fieldId: "custrecord_app_job_location_type",
                value: 2,
            });
            app_job_location_type_name = "Non-Customer";
        } else {
            app_job_rec.setValue({
                fieldId: "custrecord_app_job_location_type",
                value: 1,
            });
            app_job_location_type_name = "Customer";
        }

        //08:50|300000,08:50|300000,08:50|300000,08:50|300000,08:50|300000,08:50|300000
        var stopTimesArray = appServiceStopStopTimes.split(",");
        var serviceTime = stopTimesArray[day].split("|");

        log.debug({
            title: "serviceTime[0]",
            details: serviceTime[0],
        });

        log.debug({
            title: "convertTo12HourFormat(serviceTime[0])",
            details: convertTo12HourFormat(serviceTime[0]),
        });
        log.debug({
            title: "subtractOneHour(serviceTime[0])",
            details: subtractOneHour(serviceTime[0]),
        });
        log.debug({
            title: "convertTo12HourFormat(serviceTime[0])",
            details: convertTo12HourFormat(serviceTime[0]),
        });

        app_job_rec.setValue({
            fieldId: "addOneHour(serviceTime[0])",
            value: addOneHour(serviceTime[0]),
        });

        app_job_rec.setValue({
            fieldId: "custrecord_job_date_scheduled",
            value: netsuiteDateFormat,
        });
        app_job_rec.setValue({
            fieldId: "custrecord_job_status",
            value: 1,
        });

        var app_job_id = app_job_rec.save();

        var apiBody = '{"jobs": [{';
        apiBody += '"ns_id": "' + app_job_id + '",';
        apiBody += '"e_id": "' + app_job_id + '",';
        apiBody += '"lpo": "true",';
        apiBody += '"customer_ns_id": "' + appServiceStopCustomer + '",';
        apiBody +=
            '"time_scheduled": "' + convertTo12HourFormat(serviceTime[0]) + '",';
        apiBody += '"scheduled_before": "' + subtractOneHour(serviceTime[0]) + '",';
        apiBody += '"scheduled_after": "' + addOneHour(serviceTime[0]) + '",';
        apiBody += '"location_type": "' + app_job_location_type_name + '",';
        apiBody += '"note": "' + appServiceStopNotes + '",';
        // apiBody += '"run_ns_id": "' + appServiceStopRunPlan + '",';
        apiBody += '"operator_ns_ids": ['
        for (var x = 0; x < activeOperator.length; x++) {
            apiBody += '"' + activeOperator[x].toString() + '"';
            if (x < activeOperator.length - 1) {
                apiBody += ',';
            }
        }
        apiBody += '],';
        apiBody += '"stop_name": "' + app_job_stop_name + '",';
        apiBody += '"address": {';
        apiBody += '"address1": "' + service_leg_addr_st_num + '",';
        apiBody += '"suburb": "' + service_leg_addr_suburb + '",';
        apiBody += '"state": "' + service_leg_addr_state + '",';
        apiBody += '"postcode": "' + service_leg_addr_postcode + '",';
        apiBody += '"lat": "' + service_leg_addr_lat + '",';
        apiBody += '"lon": "' + service_leg_addr_lon + '"';
        apiBody += "},";
        apiBody += '"job_group": {';
        apiBody += '"ns_id": "' + app_job_group_id2 + '",';
        apiBody += '"name": "' + app_job_group_name + '",';
        apiBody += '"status": "Scheduled"';
        apiBody += "}";
        apiBody += "}]}";

        log.debug({
            title: "apiBody",
            details: apiBody,
        });

        try {
            var apiResponse = https.post({
                url: "https://app.mailplus.com.au/api/v1/general/ns_jobs",
                body: apiBody,
                headers: apiHeaders,
            });
            var parsedAPIResponseBody = JSON.parse(apiResponse.body);
        } catch (error) {
            if (error.name == "SSS_REQUEST_TIME_EXCEEDED") {
                var apiResponse = https.post({
                    url: "https://app.mailplus.com.au/api/v1/general/ns_jobs",
                    body: apiBody,
                    headers: apiHeaders,
                });
                var parsedAPIResponseBody = JSON.parse(apiResponse.body);
            }
        }

        log.debug({
            title: "parsedAPIResponseBody",
            details: parsedAPIResponseBody,
        });

        return app_job_id;
    }

    /*
     * PURPOSE : CHECK IF PARAM IS NULL OR EMPTY BASED ON BELOW CRITERIAS
     *  PARAMS :  -
     * RETURNS :  BOOL
     *   NOTES :
     */

    function isNullorEmpty(strVal) {
        return (
            strVal == null ||
            strVal == "" ||
            strVal == "null" ||
            strVal == undefined ||
            strVal == "undefined" ||
            strVal == "- None -" ||
            strVal == "0"
        );
    }

    // /**
    //  * @description
    //  * @author Ankith Ravindran (AR)
    //  * @date 02/05/2024
    //  * @param {*} time24
    //  * @returns {*}
    //  */
    // function convertTo12HourFormat(time24) {
    // 	var d = new Date();
    // 	dateParts = time24.split(":");
    // 	d.setHours(+dateParts[0]);
    // 	d.setMinutes(+dateParts[1]);
    // 	// Return the formatted 12-hour time
    // 	return d;
    // }

    /**
     * @description
     * @author Ankith Ravindran (AR)
     * @date 10/09/2024
     * @param {*} time24
     * @returns {*}
     */
    function convertTo12HourFormat(time24) {
        // Split the time string into hours and minutes
        var [hours, minutes] = time24.split(":").map(Number);

        // Determine AM or PM suffix
        var suffix = hours >= 12 ? "PM" : "AM";

        // Convert hours to 12-hour format
        var hours12 = hours % 12 || 12;

        var newMinutes = minutes.toString();
        newMinutes = padStart(newMinutes, 2, "0");

        // Return the formatted 12-hour time string
        return hours12 + ":" + newMinutes + " " + suffix;
    }

    /**
     * @description Adds 1 hour to a 24-hour time string
     * @param {string} time24 - The 24-hour time string (e.g., "14:30")
     * @returns {string} The new 24-hour formatted time string (e.g., "15:30")
     */
    function addOneHour(time24) {
        // Split the time string into hours and minutes
        var [hours, minutes] = time24.split(":").map(Number);

        // Create a new Date object and set the hours and minutes
        var date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);

        // Add 1 hour to the date
        date.setHours(date.getHours() + 1);

        // Format the new time as a 24-hour time string
        var newHours = date.getHours() % 12 || 12;
        var newMinutes = date.getMinutes().toString();
        newMinutes = padStart(newMinutes, 2, "0");
        var suffix = date.getHours() >= 12 ? "PM" : "AM";

        return newHours + ":" + newMinutes + " " + suffix;
    }

    /**
     * @description
     * @author Ankith Ravindran (AR)
     * @date 10/09/2024
     * @param {*} time
     * @returns {*}
     */
    function add1HourToTime(time) {
        var timeParts = time.split(":");
        var d = new Date();
        d.setHours(+timeParts[0]);
        d.setMinutes(+timeParts[1]);
        d.setHours(d.getHours() + 1);
        return d;
    }

    /**
     * @description Adds 1 hour to a 24-hour time string
     * @param {string} time24 - The 24-hour time string (e.g., "14:30")
     * @returns {string} The new 24-hour formatted time string (e.g., "15:30")
     */
    function subtractOneHour(time24) {
        // Split the time string into hours and minutes
        var [hours, minutes] = time24.split(":").map(Number);

        // Create a new Date object and set the hours and minutes
        var date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);

        // Add 1 hour to the date
        date.setHours(date.getHours() - 1);

        // Format the new time as a 24-hour time string
        var newHours = date.getHours() % 12 || 12;
        var newMinutes = date.getMinutes().toString();
        newMinutes = padStart(newMinutes, 2, "0");
        var suffix = date.getHours() >= 12 ? "PM" : "AM";

        return newHours + ":" + newMinutes + " " + suffix;
    }

    /**
     * @description Pads the current string with another string (multiple times, if needed) until the resulting string reaches the given length. The padding is applied from the start (left) of the current string.
     * @param {string} str - The original string to pad.
     * @param {number} targetLength - The length of the resulting string once the current string has been padded.
     * @param {string} padString - The string to pad the current string with. Defaults to a space if not provided.
     * @returns {string} The padded string.
     */
    function padStart(str, targetLength, padString) {
        // Convert the input to a string
        str = String(str);

        // If the target length is less than or equal to the string's length, return the original string
        if (str.length >= targetLength) {
            return str;
        }

        // Calculate the length of the padding needed
        var paddingLength = targetLength - str.length;

        // Repeat the padString enough times to cover the padding length
        var repeatedPadString = repeat(
            padString,
            Math.ceil(paddingLength / padString.length)
        );

        // Slice the repeated padString to the exact padding length needed and concatenate with the original string
        return repeatedPadString.slice(0, paddingLength) + str;
    }

    /**
     * @description Repeats the given string a specified number of times.
     * @param {string} str - The string to repeat.
     * @param {number} count - The number of times to repeat the string.
     * @returns {string} The repeated string.
     */
    function repeat(str, count) {
        // Convert the input to a string
        str = String(str);

        // If the count is 0, return an empty string
        if (count <= 0) {
            return "";
        }

        // Initialize the result string
        var result = "";

        // Repeat the string by concatenating it to the result
        for (var i = 0; i < count; i++) {
            result += str;
        }

        return result;
    }

    /**
     * @description
     * @author Ankith Ravindran (AR)
     * @date 10/09/2024
     * @param {*} time
     * @returns {*}
     */
    function subtract1HourToTime(time) {
        var timeParts = time.split(":");
        var d = new Date();
        d.setHours(+timeParts[0]);
        d.setMinutes(+timeParts[1]);
        d.setHours(d.getHours() - 1);
        return d;
    }

    /**
     * @description
     * @author Ankith Ravindran (AR)
     * @date 02/05/2024
     * @param {*} date_selected
     * @returns {*}
     */
    function dateSelected2Date(date_selected) {
        // date_selected = "2020-06-04"
        var date_array = date_selected.split("-");
        // date_array = ["2020", "06", "04"]
        var year = date_array[0];
        var month = date_array[1] - 1;
        var day = date_array[2];
        var date = new Date(year, month, day);
        return date;
    }

    return {
        execute: execute,
    };
});
