import {test,expect} from '@playwright/test';
import {projectSharedServiceRecord} from '../lib/workspace/service-sharing-policy';
import type {ServiceRecord} from '../lib/workspace/service-model';

test('a private revision preserves only previously shared content and cannot be reviewed',()=>{
 const record={visibility:'internal',title:'Private title',data:{caption:'Private caption'},version:2,revision:3,updated_at:'2026-10-10',versions:[{version:1,visibility:'shared',title:'Shared title',data:{caption:'Shared caption'},created_at:'2026-10-01'}],decisions:[{version:1,decision:'approved',created_at:'2026-10-02'}],activity:[],notes:[]} as unknown as ServiceRecord;
 const projected=projectSharedServiceRecord(record);
 expect(projected).toMatchObject({title:'Shared title',data:{caption:'Shared caption'},version:1,state:'approved',readOnlyVersion:true});
 expect(projectSharedServiceRecord({...record,versions:[]})).toBeNull();
 expect(projectSharedServiceRecord({...record,visibility:'shared'})).toEqual({...record,visibility:'shared'});
});
