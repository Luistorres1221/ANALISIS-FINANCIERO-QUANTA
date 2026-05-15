package com.quanta.analisis.controlador;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AssetControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void listAssetsShouldReturn20Items() throws Exception {
        mockMvc.perform(get("/api/v1/assets").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(20)));
    }

    @Test
    void getAssetByTickerShouldReturnCorrectName() throws Exception {
        mockMvc.perform(get("/api/v1/assets/AAPL").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.ticker").value("AAPL"))
                .andExpect(jsonPath("$.data.name").value("Apple Inc."))
                .andExpect(jsonPath("$.data.market").value("NASDAQ"));
    }

    @Test
    void getUnknownTickerShouldReturn404() throws Exception {
        mockMvc.perform(get("/api/v1/assets/FAKE").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getOhlcvWithDaysParam() throws Exception {
        mockMvc.perform(get("/api/v1/assets/ECOPETROL/ohlcv?days=90").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(90)));
    }

    @Test
    void getSmaDefaultWindow() throws Exception {
        mockMvc.perform(get("/api/v1/assets/MSFT/sma").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.window").value(20))
                .andExpect(jsonPath("$.data.ticker").value("MSFT"));
    }

    @Test
    void etlStatusShouldReturn20AssetsLoaded() throws Exception {
        mockMvc.perform(get("/api/v1/etl/status").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.assetsLoaded").value(20))
                .andExpect(jsonPath("$.data.status").value("READY"));
    }

    @Test
    void similarityShouldReturnAllMetrics() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/similarity?tickerA=AAPL&tickerB=MSFT")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tickerA").value("AAPL"))
                .andExpect(jsonPath("$.data.tickerB").value("MSFT"))
                .andExpect(jsonPath("$.data.pearson").isNumber())
                .andExpect(jsonPath("$.data.cosine").isNumber())
                .andExpect(jsonPath("$.data.euclidean").isNumber())
                .andExpect(jsonPath("$.data.dtw").isNumber());
    }

    @Test
    void riskEndpointShouldReturn20Records() throws Exception {
        mockMvc.perform(get("/api/v1/analysis/risk").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(20)));
    }
}
