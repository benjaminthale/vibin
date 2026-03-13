'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Rect } from 'react-konva';
import Konva from 'konva';
import { useStore, type CanvasClothingLayer } from '@/lib/store';

interface LoadedImage {
  instanceId: string;
  element: HTMLImageElement;
  blobUrl: string;
}

interface OutfitCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  width: number;
  height: number;
}

export function OutfitCanvas({ stageRef, width, height }: OutfitCanvasProps) {
  const {
    canvas,
    setSelectedLayer,
    updateLayer,
    pushHistory,
  } = useStore();

  const { dollCutoutBlob, layers, selectedInstanceId } = canvas;

  const [dollImage, setDollImage] = useState<{ element: HTMLImageElement; blobUrl: string } | null>(null);
  const [loadedClothing, setLoadedClothing] = useState<Map<string, LoadedImage>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);
  const selectedNodeRef = useRef<Konva.Image | null>(null);

  // Load doll image
  useEffect(() => {
    if (!dollCutoutBlob) {
      if (dollImage) {
        URL.revokeObjectURL(dollImage.blobUrl);
        setDollImage(null);
      }
      return;
    }

    const url = URL.createObjectURL(dollCutoutBlob);
    const img = new window.Image();
    img.onload = () => setDollImage({ element: img, blobUrl: url });
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dollCutoutBlob]);

  // Load clothing images - track by instanceId
  useEffect(() => {
    const currentIds = new Set(layers.map((l) => l.instanceId));

    // Remove images for deleted layers
    setLoadedClothing((prev) => {
      const next = new Map(prev);
      for (const [id, img] of next) {
        if (!currentIds.has(id)) {
          URL.revokeObjectURL(img.blobUrl);
          next.delete(id);
        }
      }
      return next;
    });

    // Load new layers
    layers.forEach((layer) => {
      if (!loadedClothing.has(layer.instanceId)) {
        const url = URL.createObjectURL(layer.cutoutBlob);
        const img = new window.Image();
        img.onload = () => {
          setLoadedClothing((prev) => {
            const next = new Map(prev);
            next.set(layer.instanceId, { instanceId: layer.instanceId, element: img, blobUrl: url });
            return next;
          });
        };
        img.src = url;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dollImage) URL.revokeObjectURL(dollImage.blobUrl);
      loadedClothing.forEach((img) => URL.revokeObjectURL(img.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current) return;
    if (selectedInstanceId && selectedNodeRef.current) {
      transformerRef.current.nodes([selectedNodeRef.current]);
    } else {
      transformerRef.current.nodes([]);
    }
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedInstanceId, loadedClothing]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedLayer(null);
      }
    },
    [setSelectedLayer]
  );

  const getDollDimensions = useCallback(() => {
    if (!dollImage) return { x: 0, y: 0, w: 0, h: 0 };
    const maxH = height * 0.7;
    const scale = Math.min(maxH / dollImage.element.naturalHeight, (width * 0.9) / dollImage.element.naturalWidth);
    const w = dollImage.element.naturalWidth * scale;
    const h = dollImage.element.naturalHeight * scale;
    return { x: (width - w) / 2, y: (height - h) / 2, w, h };
  }, [dollImage, width, height]);

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onClick={handleStageClick}
      style={{ background: '#F5F5F5' }}
    >
      {/* Background layer */}
      <Layer>
        <Rect x={0} y={0} width={width} height={height} fill="#F5F5F5" />
      </Layer>

      {/* Doll layer (Layer 0) */}
      <Layer>
        {dollImage && (() => {
          const { x, y, w, h } = getDollDimensions();
          return (
            <KonvaImage
              image={dollImage.element}
              x={x}
              y={y}
              width={w}
              height={h}
            />
          );
        })()}
      </Layer>

      {/* Clothing layers */}
      <Layer>
        {sortedLayers.map((layer) => {
          const loaded = loadedClothing.get(layer.instanceId);
          if (!loaded) return null;
          return (
            <ClothingNode
              key={layer.instanceId}
              layer={layer}
              image={loaded.element}
              isSelected={selectedInstanceId === layer.instanceId}
              onSelect={() => setSelectedLayer(layer.instanceId)}
              onDragEnd={(x, y) => {
                pushHistory();
                updateLayer(layer.instanceId, { x, y });
              }}
              onTransformEnd={(attrs) => {
                pushHistory();
                updateLayer(layer.instanceId, attrs);
              }}
              nodeRef={selectedInstanceId === layer.instanceId ? selectedNodeRef : undefined}
            />
          );
        })}
        <Transformer
          ref={transformerRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          rotateEnabled={true}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}

interface ClothingNodeProps {
  layer: CanvasClothingLayer;
  image: HTMLImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
  onTransformEnd: (attrs: Partial<CanvasClothingLayer>) => void;
  nodeRef?: React.RefObject<Konva.Image | null>;
}

function ClothingNode({
  layer,
  image,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
  nodeRef,
}: ClothingNodeProps) {
  const localRef = useRef<Konva.Image>(null);
  const ref = nodeRef || localRef;

  const handleTransformEnd = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    onTransformEnd({
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
    node.scaleX(1);
    node.scaleY(1);
  }, [ref, onTransformEnd]);

  return (
    <KonvaImage
      ref={ref}
      image={image}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      onTransformEnd={handleTransformEnd}
    />
  );
}
