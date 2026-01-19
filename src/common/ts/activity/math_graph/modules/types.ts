// 그래프 데이터 타입 정의
export type GraphData = {
  title: string;
  subTitles: {
    top: string;
    bottom: string;
  };
  unitValues: {
    top: string | null;
    bottom: string;
  };
  dataItems: Array<{
    label: string;
    value: number;
  }>;
  totalValue: number;
  pictureGraphData?: {
    selectedImageIndex: number;
    imageUnitValues: Array<{
      size: string;
      value: string;
    }>;
  };
  gradationData?: {
    selectedValue: string;
  };
};

// 그래프 타입 정의
export type GraphType = "picture" | "bar-col" | "bar-row" | "line" | "strip" | "pie";

// 이미지 타입 정의
export type ImageType = "big" | "medium" | "small";

// 드래그 데이터 타입 정의
export type DragData = {
  imgType: ImageType;
  selectedImageIndex: number;
};
