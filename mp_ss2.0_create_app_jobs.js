/**
 *@NApiVersion 2.x
 *@NScriptType ScheduledScript

 * Author:               Ankith Ravindran
 * Created on:           Wed May 01 2024
 * Modified on:          Wed May 01 2024 12:18:50
 * SuiteScript Version:  2.0
 * Description:          Schedule Script to create App jobs. 
 *
 * Copyright (c) 2024 MailPlus Pty. Ltd.
 */


define(['SuiteScripts/jQuery Plugins/Moment JS/moment.min', 'N/task', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/format'],
    function (moment, task, email, runtime, search, record, format) {


        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        var day = moment.utc().day(); //Get the day of the week
        var date = moment.utc().add(1, 'days').date(); //Get tomorrows date
        var month = moment.utc().month(); //Get current month
        var year = moment.utc().year(); //Get current Year

        log.debug({
            title: 'day',
            details: day
        })
        log.debug({
            title: 'date',
            details: date
        })
        log.debug({
            title: 'month',
            details: month
        })
        log.debug({
            title: 'year',
            details: year
        })

        var startDate = moment([year, month]); //Get Start Date of the current Month
        var endDate = moment(startDate).endOf('month').date(); //Get the end date of the current month

        //Calculate the App Job Date based on todays date. If todays date is the last day of the month, next move to first of next month else set as tomorrows date. 
        var setMonth;
        if (moment.utc().date() == endDate) {
            date_of_week = date + '/' + (month + 2) + '/' + year;
            setMonth = (month + 2)
        } else {
            date_of_week = date + '/' + (month + 1) + '/' + year;
            setMonth = (month + 1)
        }

        log.debug({
            title: 'date_of_week',
            details: date_of_week
        })

        var netsuiteDateFormat = dateSelected2Date(year + '-' + setMonth + '-' + date);

        log.debug({
            title: 'netsuiteDateFormat',
            details: netsuiteDateFormat
        })

        var new_day = 0;
        new_day = day + 1;

        log.debug({
            title: 'new_day',
            details: new_day
        })

        //Use the correct search based on the day of the week.
        switch (new_day) {
            case 1:
                var serviceStopSearch = search.load({
                    id: 'customsearch_ser_stops_create_job_mon',
                    type: 'customrecord_service_stop'
                });
                break;
            case 2:
                var serviceStopSearch = search.load({
                    id: 'customsearch_ser_stops_create_job_tue',
                    type: 'customrecord_service_stop'
                });
                break;
            case 3:
                var serviceStopSearch = search.load({
                    id: 'customsearch_ser_stops_create_job_wed',
                    type: 'customrecord_service_stop'
                });
                break;
            case 4:
                var serviceStopSearch = search.load({
                    id: 'customsearch_ser_stops_create_job_thu',
                    type: 'customrecord_service_stop'
                });
                break;
            case 5:
                var serviceStopSearch = search.load({
                    id: 'customsearch_ser_stops_create_job_fri',
                    type: 'customrecord_service_stop'
                });
                break;
        }


        function execute(context) {

            var old_service_id;
            var app_job_group_id2;

            var count = 0;
            var exit = false;
            serviceStopSearch.run().each(function (result) {

                var appServiceStopInternalId = result.getValue({
                    name: 'internalid'
                });
                var appServiceStopStopName = result.getValue({
                    name: 'custrecord_1288_stop_name'
                });
                var appServiceStopStopTimes = result.getValue({
                    name: 'custrecord_1288_stop_times'
                });
                var appServiceStopCustomer = result.getValue({
                    name: 'custrecord_1288_customer'
                });
                var appServiceStopCustomerText = result.getText({
                    name: 'custrecord_1288_customer'
                });
                var appServiceStopFranchisee = result.getValue({
                    name: 'custrecord_1288_franchisee'
                });
                var appServiceStopService = result.getValue({
                    name: 'custrecord_1288_service'
                });
                var appServiceStopOperator = result.getValue({
                    name: 'custrecord_1288_operator'
                });
                var appServiceStopRunPlan = result.getValue({
                    name: 'custrecord_1288_plan'
                });
                var appServiceStopAddressType = result.getValue({
                    name: 'custrecord_1288_address_type'
                });
                var appServiceStopFreq = result.getValue({
                    name: 'custrecord_1288_frequency'
                });
                var appServiceStopNotes = result.getValue({
                    name: 'custrecord_1288_notes'
                });
                var appServiceAddressBook = result.getValue({
                    name: 'custrecord_1288_address_book'
                });
                var appServicePostalLocation = result.getValue({
                    name: 'custrecord_1288_postal_location'
                });

                log.debug({
                    title: 'appServiceStopStopName',
                    details: appServiceStopStopName
                })
                log.debug({
                    title: 'appServiceStopCustomer',
                    details: appServiceStopCustomer
                })
                log.debug({
                    title: 'appServiceStopService',
                    details: appServiceStopService
                });
                log.debug({
                    title: 'appServiceStopOperator',
                    details: appServiceStopOperator
                });
                log.debug({
                    title: 'appServiceStopAddressType',
                    details: appServiceStopAddressType
                })
                log.debug({
                    title: 'appServiceAddressBook',
                    details: appServiceAddressBook
                })
                log.debug({
                    title: 'appServicePostalLocation',
                    details: appServicePostalLocation
                })

                var service_leg_addr_add1 = null;
                var service_leg_addr_st_num = null;
                var service_leg_addr_suburb = null;
                var service_leg_addr_state = null;
                var service_leg_addr_postcode = null;
                var service_leg_addr_lat = null;
                var service_leg_addr_lon = null;

                if (!isNullorEmpty(appServiceAddressBook)) {
                    //Load the lead record
                    var customerRecord = record.load({
                        type: record.Type.CUSTOMER,
                        id: appServiceStopCustomer,
                        isDynamic: true
                    });
                    var lineIndex = customerRecord.findSublistLineWithValue({
                        sublistId: 'addressbook',
                        fieldId: 'internalid',
                        value: appServiceAddressBook
                    });

                    if (lineIndex > -1) {
                        customerRecord.selectLine({
                            sublistId: 'addressbook',
                            line: lineIndex
                        });

                        var addressSubrecord = customerRecord.getCurrentSublistSubrecord({ sublistId: 'addressbook', fieldId: 'addressbookaddress' });

                        service_leg_addr_add1 = addressSubrecord.getValue({
                            fieldId: 'addr1'
                        });
                        service_leg_addr_st_num = addressSubrecord.getValue({
                            fieldId: 'addr2'
                        });
                        service_leg_addr_suburb = addressSubrecord.getValue({
                            fieldId: 'city'
                        });
                        service_leg_addr_state = addressSubrecord.getValue({
                            fieldId: 'state'
                        });
                        service_leg_addr_postcode = addressSubrecord.getValue({
                            fieldId: 'zip'
                        });
                        service_leg_addr_lat = addressSubrecord.getValue({
                            fieldId: 'custrecord_address_lat',
                        });
                        service_leg_addr_lon = addressSubrecord.getValue({
                            fieldId: 'custrecord_address_lon'
                        });
                    }
                }

                if (!isNullorEmpty(appServicePostalLocation)) {
                    var nclRecord = record.load({
                        type: 'customrecord_ap_lodgment_location',
                        id: appServicePostalLocation
                    });

                    service_leg_addr_add1 = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_addr1'
                    });
                    service_leg_addr_st_num = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_addr2'
                    });
                    service_leg_addr_suburb = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_suburb'
                    });
                    service_leg_addr_state = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_site_state'
                    });
                    service_leg_addr_postcode = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_postcode'
                    });
                    service_leg_addr_lat = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_lat'
                    });
                    service_leg_addr_lon = nclRecord.getValue({
                        fieldId: 'custrecord_ap_lodgement_long'
                    });
                }

                log.debug({
                    title: 'service_leg_addr_st_num',
                    details: service_leg_addr_st_num
                })
                log.debug({
                    title: 'service_leg_addr_suburb',
                    details: service_leg_addr_suburb
                })
                log.debug({
                    title: 'service_leg_addr_state',
                    details: service_leg_addr_state
                })
                log.debug({
                    title: 'service_leg_addr_postcode',
                    details: service_leg_addr_postcode
                })
                log.debug({
                    title: 'service_leg_addr_lat',
                    details: service_leg_addr_lat
                })
                log.debug({
                    title: 'service_leg_addr_lon',
                    details: service_leg_addr_lon
                })

                if (isNullorEmpty(old_service_id)) {
                    //Create App Job Group
                    app_job_group_id2 = createAppJobGroup(appServiceStopStopName,
                        appServiceStopCustomer, appServiceStopFranchisee, appServiceStopService);

                    //Create App Jobs
                    createAppJobs(appServiceStopCustomer, appServiceStopStopName,
                        appServiceStopService,
                        appServiceStopStopTimes,
                        app_job_group_id2,
                        service_leg_addr_st_num,
                        service_leg_addr_suburb,
                        service_leg_addr_state,
                        service_leg_addr_postcode,
                        service_leg_addr_lat,
                        service_leg_addr_lon, appServiceStopFranchisee, appServiceStopNotes, appServiceStopRunPlan, appServiceStopAddressType, appServiceStopFreq, appServiceStopCustomerText);

                } else if (old_service_id == appServiceStopService) {

                    //Create App Jobs
                    createAppJobs(appServiceStopCustomer, appServiceStopStopName,
                        appServiceStopService,
                        appServiceStopStopTimes,
                        app_job_group_id2,
                        service_leg_addr_st_num,
                        service_leg_addr_suburb,
                        service_leg_addr_state,
                        service_leg_addr_postcode,
                        service_leg_addr_lat,
                        service_leg_addr_lon, appServiceStopFranchisee, appServiceStopNotes, appServiceStopRunPlan, appServiceStopAddressType, appServiceStopFreq, appServiceStopCustomerText);

                } else if (old_service_id != appServiceStopService) {
                    reschedule = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: 'customscript_ss2_create_app_jobs',
                        deploymentId: 'customdeploy1',
                        params: params
                    });

                    log.audit({
                        title: 'Reschedule Return - IN LOOP'
                    });
                    var rescheduled = reschedule.submit();

                }

                //Mark "App Job Created" in the App Service Stop as true
                var serviceStopRecord = record.load({
                    type: 'customrecord_service_stop',
                    id: appServiceStopInternalId,
                });

                serviceStopRecord.setValue({
                    fieldId: 'custrecord_1288_app_job_created',
                    value: true
                });

                serviceStopRecord.save();

                if (exit == false) {
                    old_service_id = appServiceStopService;
                    count++;
                    return true;
                }

            });

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
        function createAppJobGroup(service_leg_service_text,
            service_leg_customer, service_leg_zee, service_id) {

            var app_job_group_rec = record.create({
                type: 'customrecord_jobgroup',
            });
            app_job_group_rec.setValue({
                fieldId: 'name',
                value: service_leg_service_text + '_' + date_of_week
            });
            app_job_group_rec.setValue({
                fieldId: 'custrecord_jobgroup_ref',
                value: service_leg_service_text + '_' + date_of_week
            });
            app_job_group_rec.setValue({
                fieldId: 'custrecord_jobgroup_customer',
                value: service_leg_customer
            });
            app_job_group_rec.setValue({
                fieldId: 'custrecord_jobgroup_franchisee',
                value: service_leg_zee
            });
            app_job_group_rec.setValue({
                fieldId: 'custrecord_jobgroup_service',
                value: service_id
            });
            app_job_group_rec.setValue({
                fieldId: 'custrecord_jobgroup_status',
                value: 4
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
        function createAppJobs(appServiceStopCustomer, appServiceStopStopName,
            appServiceStopService,
            appServiceStopStopTimes,
            app_job_group_id2,
            service_leg_addr_st_num,
            service_leg_addr_suburb,
            service_leg_addr_state,
            service_leg_addr_postcode,
            service_leg_addr_lat,
            service_leg_addr_lon, appServiceStopFranchisee, appServiceStopNotes, appServiceStopRunPlan, appServiceStopAddressType, appServiceStopFreq, appServiceStopCustomerText) {

            var app_job_rec = record.create({
                type: 'customrecord_job',
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_job_franchisee',
                value: appServiceStopFranchisee
            });


            var frequencyArray = appServiceStopFreq.split(',');

            //1,1,1,1,1,0
            if (frequencyArray[5] == 1 || frequencyArray[5] == '1') {
                if (appServiceStopAddressType == 3) {
                    app_job_rec.setValue({
                        fieldId: 'custrecord_app_job_stop_name',
                        value: 'ADHOC - ' + appServiceStopStopName + ' - ' + appServiceStopCustomerText
                    });
                } else {
                    app_job_rec.setValue({
                        fieldId: 'custrecord_app_job_stop_name',
                        value: 'ADHOC - ' + appServiceStopStopName
                    });
                }
            } else {
                app_job_rec.setValue({
                    fieldId: 'custrecord_app_job_stop_name',
                    value: appServiceStopStopName
                });
            }

            app_job_rec.setValue({
                fieldId: 'custrecord_job_customer',
                value: appServiceStopCustomer
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_job_source',
                value: 6
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_job_service',
                value: appServiceStopService
            });


            //Get the service price from the service record
            var serviceRecord = record.load({
                type: 'customrecord_service',
                id: appServiceStopService,
            });

            var servicePrice = serviceRecord.getValue({
                fieldId: 'custrecord_service_price',
            })

            app_job_rec.setValue({
                fieldId: 'custrecord_job_service_price',
                value: servicePrice
            });

            app_job_rec.setValue({
                fieldId: 'custrecord_job_group',
                value: app_job_group_id2
            });

            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_st_name_no',
                value: service_leg_addr_st_num
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_suburb',
                value: service_leg_addr_suburb
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_state',
                value: service_leg_addr_state
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_post_code',
                value: service_leg_addr_postcode
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_lat',
                value: service_leg_addr_lat
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_lon',
                value: service_leg_addr_lon
            });

            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_notes',
                value: appServiceStopNotes
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_app_job_run',
                value: appServiceStopRunPlan
            });

            if (appServiceStopAddressType == 3) {
                app_job_rec.setValue({
                    fieldId: 'custrecord_app_job_location_type',
                    value: 2
                });
            } else {
                app_job_rec.setValue({
                    fieldId: 'custrecord_app_job_location_type',
                    value: 1
                });
            }

            //08:50|300000,08:50|300000,08:50|300000,08:50|300000,08:50|300000,08:50|300000
            var stopTimesArray = appServiceStopStopTimes.split(',');
            var serviceTime = stopTimesArray[day].split('|');

            app_job_rec.setValue({
                fieldId: 'custrecord_job_time_scheduled',
                value: convertTo12HourFormat(serviceTime[0])
            });

            app_job_rec.setValue({
                fieldId: 'custrecord_job_date_scheduled',
                value: netsuiteDateFormat
            });
            app_job_rec.setValue({
                fieldId: 'custrecord_job_status',
                value: 1
            });

            app_job_rec.save();
        }


        /*
         * PURPOSE : CHECK IF PARAM IS NULL OR EMPTY BASED ON BELOW CRITERIAS
         *  PARAMS :  -
         * RETURNS :  BOOL
         *   NOTES :
         */

        function isNullorEmpty(strVal) {
            return (strVal == null || strVal == '' || strVal == 'null' || strVal ==
                undefined || strVal == 'undefined' || strVal == '- None -' ||
                strVal ==
                '0');
        }

        /**
         * @description
         * @author Ankith Ravindran (AR)
         * @date 02/05/2024
         * @param {*} time24
         * @returns {*} 
         */
        function convertTo12HourFormat(time24) {

            var d = new Date();
            dateParts = time24.split(":");
            d.setHours(+dateParts[0]);
            d.setMinutes(+dateParts[1]);
            // Return the formatted 12-hour time
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
            var date_array = date_selected.split('-');
            // date_array = ["2020", "06", "04"]
            var year = date_array[0];
            var month = date_array[1] - 1;
            var day = date_array[2];
            var date = new Date(year, month, day);
            return date;
        }

        return {
            execute: execute
        };
    }
);