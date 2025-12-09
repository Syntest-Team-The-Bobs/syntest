// src/components/dashboard/DashboardDragGrid.jsx
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

/**
 * DragGrid wraps children (ordered) and allows ordering them.
 * children must be passed as elements with keys matching layout items.
 * layout is an array of keys in the desired order.
 */
export default function DragGrid({ children, layout = null, onLayoutChange = () => {} }) {
  // Build keyed map of children
  const childrenArray = React.Children.toArray(children);
  const keyed = {};
  childrenArray.forEach((c) => { keyed[c.key] = c; });

  const initialLayout = layout || childrenArray.map((c) => c.key);
  const [order, setOrder] = React.useState(initialLayout);

  React.useEffect(() => {
    setOrder(initialLayout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childrenArray.length]);

  function onDragEnd(result) {
    if (!result.destination) return;
    const next = Array.from(order);
    const [removed] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, removed);
    setOrder(next);
    onLayoutChange(next);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="dashboard-grid">
        {(provided) => (
          <div className="dashboard-grid" ref={provided.innerRef} {...provided.droppableProps}>
            {order.map((key, idx) => {
              const child = keyed[key];
              if (!child) return null;
              return (
                <Draggable draggableId={String(key)} index={idx} key={String(key)}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      className="dashboard-grid-item"
                    >
                      {child}
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
