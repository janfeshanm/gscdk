#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { GscdkStack } from '../lib/gscdk-stack';

const app = new cdk.App();
new GscdkStack(app, 'GscdkStack', {
  env: { account: '016491065640', region: 'ap-southeast-2' },
 });