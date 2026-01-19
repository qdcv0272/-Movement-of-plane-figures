type PageProps = {
  root: string;
  cc?: AnimateCCProps;
};

type StepProps = {
  linkName?: string; // cc용
  root?: string; // html용
  cc?: AnimateCC;
  sounds?: {
    bgm?: string;
  };
};
