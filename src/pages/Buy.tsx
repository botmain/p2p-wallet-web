import React, { FunctionComponent } from 'react';

import { Layout } from 'components/common/Layout';
import { BuyWidget } from 'components/pages/buy';

export const Buy: FunctionComponent = () => {
  return <Layout rightColumn={<BuyWidget />} />;
};
