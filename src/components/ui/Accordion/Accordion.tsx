import React, { FC, useState } from 'react';

import { styled } from '@linaria/react';
import classNames from 'classnames';

import { Icon } from 'components/ui';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;

  width: 100%;

  border: 1px solid #f6f6f8;
  border-radius: 12px;
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;

  padding: 20px;

  cursor: pointer;

  &.isOpen {
    border-bottom: 1px solid #f6f6f8;
  }
`;

const Title = styled.div`
  display: flex;
  flex-grow: 1;

  font-weight: 600;
  font-size: 16px;
`;

const ChevronIcon = styled(Icon)`
  width: 20px;
  height: 20px;

  color: #a3a5ba;

  &.isOpen {
    transform: rotate(180deg);
  }
`;

const Content = styled.div`
  &:not(.noContentPadding) {
    padding: 16px 20px;
  }
`;

type Props = {
  title: string | React.ReactNode;
  open?: boolean;
  noContentPadding?: boolean;
  className?: string;
};

export const Accordion: FC<Props> = ({
  title,
  open = false,
  noContentPadding,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(open);

  return (
    <Wrapper className={className}>
      <TitleWrapper onClick={() => setIsOpen(!isOpen)} className={classNames({ isOpen })}>
        <Title>{title}</Title>
        <ChevronIcon name="chevron" className={classNames({ isOpen })} />
      </TitleWrapper>
      {isOpen ? (
        <Content className={classNames({ noContentPadding })}>{children}</Content>
      ) : undefined}
    </Wrapper>
  );
};
